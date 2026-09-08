"""
SPECTR Weapon Model Test & Evaluation Script
Runs inference on test dataset images and displays bounding box results & confidence scores.
"""
import os
import glob
from ultralytics import YOLO

def test_model():
    model_path = "yolov8_weapon.pt"
    if not os.path.exists(model_path):
        # Fall back to latest checkpoint if training in progress
        runs_weights = os.path.join("runs", "detect", "weapon_model", "weights", "last.pt")
        if os.path.exists(runs_weights):
            model_path = runs_weights
        else:
            print("⚠️ No trained weapon model found yet. Waiting for training to save weights.")
            return

    print(f"🔍 Loading Weapon Model from: {model_path}")
    model = YOLO(model_path)

    test_dir = os.path.abspath("dataset/test/images")
    output_dir = os.path.abspath("test_results")
    os.makedirs(output_dir, exist_ok=True)

    test_images = glob.glob(os.path.join(test_dir, "*.jpg")) + glob.glob(os.path.join(test_dir, "*.png"))
    
    if not test_images:
        print(f"No test images found in {test_dir}")
        return

    print(f"Running inference on {min(5, len(test_images))} sample test images...\n")
    print("=" * 60)
    print(f"{'IMAGE NAME':<30} | {'CLASS DETECTED':<15} | {'CONFIDENCE'}")
    print("=" * 60)

    for img_path in test_images[:5]:
        results = model.predict(img_path, conf=0.25, verbose=False)
        img_name = os.path.basename(img_path)
        
        boxes = results[0].boxes
        if len(boxes) > 0:
            for box in boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names.get(cls_id, f"Class {cls_id}")
                conf = float(box.conf[0]) * 100
                print(f"{img_name:<30} | {cls_name:<15} | {conf:.1f}%")
            
            # Save annotated output image
            save_path = os.path.join(output_dir, f"out_{img_name}")
            results[0].save(filename=save_path)
        else:
            print(f"{img_name:<30} | {'No weapon':<15} | N/A")

    print("=" * 60)
    print(f"\n✅ Annotated test output images saved to: {output_dir}\n")

if __name__ == "__main__":
    test_model()
