import test from "node:test";
import assert from "node:assert/strict";
import { analyzeInstructionDocument, evaluateTeachBack, runCareRelay } from "../src/core.mjs";

const document = { id: "CR-SYN-001", title: "Phiếu hướng dẫn synthetic", sections: [
  { id: "follow-up", label: "Tái khám", text: "Tái khám vào ngày 15 tháng 8 tại điểm A.", citation: "CR-SYN-001 §1", critical: true, keywords: ["tái khám", "15 tháng 8", "điểm A"] },
  { id: "schedule", label: "Lịch thực hiện", text: "Thực hiện theo ba thời điểm sáng, trưa và tối như phiếu đã duyệt.", citation: "CR-SYN-001 §2", critical: true, keywords: ["sáng", "trưa", "tối"] },
  { id: "contact", label: "Liên hệ", text: "Liên hệ nơi phụ trách khi xuất hiện dấu hiệu cảnh báo X.", citation: "CR-SYN-001 §3", critical: true, keywords: ["liên hệ", "dấu hiệu cảnh báo X"] }
] };

test("preserves citations and invents nothing", () => {
  const result = analyzeInstructionDocument(document);
  assert.equal(result.status, "ready"); assert.equal(result.citationCoverage, 1); assert.equal(result.audit.inventedItems, 0);
});
test("complete teach-back covers critical items", () => {
  const result = runCareRelay(document, "Tôi tái khám ngày 15 tháng 8 tại điểm A, thực hiện sáng trưa tối và liên hệ khi có dấu hiệu cảnh báo X.");
  assert.equal(result.teachBack.status, "understood"); assert.equal(result.teachBack.criticalRecall, 1);
});
test("missing critical time requires confirmation", () => {
  const result = runCareRelay(document, "Tôi tái khám ngày 15 tháng 8 tại điểm A và thực hiện sáng tối.");
  assert.equal(result.teachBack.status, "needs_confirmation");
});
test("short answer abstains", () => {
  const checklist = analyzeInstructionDocument(document).checklist;
  const result = evaluateTeachBack(checklist, "Vâng");
  assert.equal(result.abstained, true);
});
