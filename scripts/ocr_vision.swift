// OCR tabel IPH memakai Apple Vision (macOS).
// Pemakaian: swift scripts/ocr_vision.swift <out.json> <gambar1.png> [gambar2.png ...]
// Keluaran: { "<path>": { "width": W, "height": H, "obs": [ {text, x, y, w, h, conf} ] } }
// Koordinat dalam piksel, titik asal kiri-atas.
import Foundation
import Vision
import AppKit

func recognize(_ path: String) -> [String: Any]? {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
    let W = Double(cg.width), H = Double(cg.height)
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false   // jangan "membetulkan" angka/nama komoditas
    req.recognitionLanguages = ["id-ID", "en-US"]
    req.minimumTextHeight = 0
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([req]) } catch { return nil }
    var obs: [[String: Any]] = []
    for o in req.results ?? [] {
        guard let c = o.topCandidates(1).first else { continue }
        let b = o.boundingBox
        obs.append([
            "text": c.string,
            "x": b.minX * W, "y": (1 - b.maxY) * H,
            "w": b.width * W, "h": b.height * H,
            "conf": Double(c.confidence)
        ])
    }
    return ["width": W, "height": H, "obs": obs]
}

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: ocr_vision.swift <out.json> <images...>\n".data(using: .utf8)!)
    exit(1)
}
var out: [String: Any] = [:]
for p in args[2...] {
    if let r = recognize(p) { out[p] = r }
    else { FileHandle.standardError.write("gagal: \(p)\n".data(using: .utf8)!) }
}
let data = try JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
try data.write(to: URL(fileURLWithPath: args[1]))
print("OCR selesai: \(out.count) gambar -> \(args[1])")
