const VI_MARKS = /[\u0300-\u036f]/g;

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(VI_MARKS, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value) {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function overlapScore(expected, actual) {
  const wanted = tokens(expected);
  const got = tokens(actual);
  if (!wanted.size) return 0;
  let hits = 0;
  for (const token of wanted) if (got.has(token)) hits += 1;
  return hits / wanted.size;
}

export function analyzeInstructionDocument(document) {
  if (!document || !Array.isArray(document.sections) || !document.sections.length) {
    throw new TypeError("Tài liệu phải có ít nhất một mục nguồn.");
  }
  const checklist = document.sections.map((section, index) => {
    const text = String(section.text ?? "").trim();
    const citation = section.citation == null ? "" : String(section.citation).trim();
    const keywords = Array.isArray(section.keywords) && section.keywords.length
      ? section.keywords.map(String) : [...tokens(text)].slice(0, 8);
    const sourceComplete = text.length >= 12 && citation.length > 0;
    return {
      id: String(section.id ?? `item-${index + 1}`), label: String(section.label ?? `Mục ${index + 1}`),
      action: text, citation, critical: section.critical === true, keywords,
      confidence: sourceComplete ? 1 : 0, status: sourceComplete ? "ready" : "abstain"
    };
  });
  return {
    document: { id: String(document.id ?? "SYNTHETIC-DOCUMENT"), title: String(document.title ?? "Hướng dẫn synthetic"), notice: String(document.notice ?? "Dữ liệu synthetic phục vụ kiểm thử.") },
    checklist,
    status: checklist.every((item) => item.status === "ready") ? "ready" : "needs_confirmation",
    citationCoverage: checklist.filter((item) => item.citation).length / checklist.length,
    audit: { engine: "care-relay-deterministic/0.1.0", evaluatedAt: new Date().toISOString(), sourceItems: checklist.length, inventedItems: 0 }
  };
}

export function evaluateTeachBack(checklistInput, response) {
  const checklist = Array.isArray(checklistInput) ? checklistInput : checklistInput?.checklist;
  if (!Array.isArray(checklist) || checklist.length === 0) throw new TypeError("Checklist không hợp lệ.");
  const spoken = normalize(response);
  if (spoken.length < 8) {
    return { status: "needs_confirmation", summary: "Phản hồi quá ngắn để xác nhận mức độ hiểu.", items: checklist.map((item) => ({ ...item, teachBackStatus: "uncertain", matchScore: 0 })), criticalRecall: 0, abstained: true };
  }
  const items = checklist.map((item) => {
    const keywordScore = overlapScore(item.keywords?.join(" ") || item.action, spoken);
    const actionScore = overlapScore(item.action, spoken);
    const matchScore = Math.max(keywordScore, actionScore);
    const threshold = item.critical ? 0.8 : 0.45;
    const teachBackStatus = matchScore >= threshold ? "covered" : item.critical ? "missing" : "uncertain";
    return { ...item, teachBackStatus, matchScore: Number(matchScore.toFixed(3)) };
  });
  const critical = items.filter((item) => item.critical);
  const coveredCritical = critical.filter((item) => item.teachBackStatus === "covered");
  const criticalRecall = critical.length ? coveredCritical.length / critical.length : 1;
  const safe = criticalRecall === 1;
  return {
    status: safe ? "understood" : "needs_confirmation",
    summary: safe ? "Các mục quan trọng đã được nhắc lại." : "Có mục quan trọng cần nhân viên xác nhận lại.",
    items, criticalRecall, abstained: false,
    audit: { evaluatedAt: new Date().toISOString(), responseLength: spoken.length }
  };
}

export function runCareRelay(document, response) {
  const analysis = analyzeInstructionDocument(document);
  return { analysis, teachBack: evaluateTeachBack(analysis.checklist, response) };
}
