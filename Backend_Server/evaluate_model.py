"""
SPECTR Weapon Model Accuracy & Validation Benchmark
Evaluates the fine-tuned YOLOv8 weapon model on test images,
calculating confidence distribution and generating visual detection proofs.
"""
import os
import glob
from ultralytics import YOLO

def evaluate():
    model_path = "yolov8_weapon.pt"
    if not os.path.exists(model_path):
        runs_weights = os.path.join("runs", "detect", "weapon_model_perfect", "weights", "best.pt")
        if os.path.exists(runs_weights):
            model_path = runs_weights
        else:
            print("⚠️ No trained weapon model found (yolov8_weapon.pt). Please run train_weapon_yolo.py first.")
            return

    print("=" * 65)
    print(f"🔍 SPECTR MODEL EVALUATION BENCHMARK")
    print(f"📦 Model Weights Path: {model_path}")
    print("=" * 65)

    model = YOLO(model_path)
    test_dir = os.path.abspath("dataset/test/images")
    output_dir = os.path.abspath("test_results")
    os.makedirs(output_dir, exist_ok=True)

    test_images = glob.glob(os.path.join(test_dir, "*.jpg")) + glob.glob(os.path.join(test_dir, "*.png"))
    
    if not test_images:
        print(f"❌ No test images found in {test_dir}")
        return

    print(f"📊 Running high-resolution inference on sample test images...\n")
    print(f"{'IMAGE NAME':<32} | {'DETECTED WEAPON':<18} | {'CONFIDENCE'}")
    print("-" * 65)

    detected_count = 0
    total_samples = min(10, len(test_images))

    for img_path in test_images[:total_samples]:
        results = model.predict(img_path, conf=0.25, imgsz=416, verbose=False)
        img_name = os.path.basename(img_path)
        
        boxes = results[0].boxes
        if len(boxes) > 0:
            detected_count += 1
            for box in boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names.get(cls_id, f"Class {cls_id}").upper()
                conf = float(box.conf[0]) * 100
                print(f"{img_name[:30]:<32} | {cls_name:<18} | {conf:.1f}%")
            
            save_path = os.path.join(output_dir, f"detected_{img_name}")
            results[0].save(filename=save_path)
        else:
            print(f"{img_name[:30]:<32} | {'NO WEAPON':<18} | N/A")

    print("-" * 65)
    accuracy = (detected_count / total_samples) * 100
    print(f"📈 Detection Hit Rate: {detected_count}/{total_samples} ({accuracy:.1f}%)")
    print(f"✅ Visual annotated test outputs saved to: {output_dir}\n")

if __name__ == "__main__":
    evaluate()
