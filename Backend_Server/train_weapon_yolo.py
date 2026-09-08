"""
SPECTR Weapon Model Training Script
Fine-tunes YOLOv8n on extracted weapon dataset ('gun', 'weapon')
"""
import os
import shutil
from ultralytics import YOLO

def main():
    dataset_yaml = os.path.abspath("dataset/data.yaml")
    print(f"[SYSTEM] Starting YOLOv8 Weapon Fine-Tuning using dataset config: {dataset_yaml}")

    # Load pre-trained base model
    model = YOLO("yolov8n.pt")

    # Train for 15 epochs with 320 image size for fast execution
    results = model.train(
        data=dataset_yaml,
        epochs=15,
        imgsz=320,
        batch=16,
        name="weapon_model",
        exist_ok=True
    )

    best_weights = os.path.join("runs", "detect", "weapon_model", "weights", "best.pt")
    target_weights = "yolov8_weapon.pt"

    if os.path.exists(best_weights):
        shutil.copy(best_weights, target_weights)
        print(f"\n✅ Training complete! Best weights saved to '{target_weights}'")
    else:
        print(f"\n⚠️ Training finished. Check output folder: runs/detect/weapon_model")

if __name__ == "__main__":
    main()
