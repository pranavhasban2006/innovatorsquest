"""
SPECTR Weapon Detection Fine-Tuning Engine
Uses YOLOv8 with Advanced Augmentation, High-Resolution Scaling, and Learning Rate Warmup
"""
import os
import shutil
import time
from ultralytics import YOLO

def main():
    dataset_yaml = os.path.abspath("dataset/data.yaml")
    print(f"============================================================")
    print(f"🔥 SPECTR HIGH-PRECISION WEAPON MODEL FINE-TUNING ENGINE")
    print(f"============================================================")
    print(f"📂 Dataset Config Path: {dataset_yaml}")

    if not os.path.exists(dataset_yaml):
        print(f"❌ Error: dataset/data.yaml not found!")
        return

    # Load pre-trained base YOLO model
    base_model_path = "yolov8n.pt"
    print(f"📦 Initializing base model: {base_model_path}")
    model = YOLO(base_model_path)

    # Advanced Training Hyperparameters for Maximum Accuracy & Robustness
    print(f"🚀 Launching fine-tuning process with augmentations...")
    start_time = time.time()

    results = model.train(
        data=dataset_yaml,
        epochs=25,
        imgsz=416,
        batch=16,
        workers=4,
        patience=8,
        name="weapon_model_perfect",
        exist_ok=True,
        lr0=0.005,
        lrf=0.01,
        warmup_epochs=3.0,
        mosaic=1.0,
        mixup=0.15,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        save=True,
        plots=True,
        verbose=True
    )

    elapsed = time.time() - start_time
    print(f"\n⏱️ Fine-tuning finished in {elapsed/60:.2f} minutes.")

    # Locate best trained weights
    best_weights = os.path.join("runs", "detect", "weapon_model_perfect", "weights", "best.pt")
    target_weights = "yolov8_weapon.pt"

    if os.path.exists(best_weights):
        shutil.copy(best_weights, target_weights)
        print(f"============================================================")
        print(f"✅ SUCCESS: Fine-tuned model saved to '{target_weights}'!")
        print(f"============================================================")
    else:
        print(f"⚠️ Warning: Check runs/detect/weapon_model_perfect/weights for best.pt")

if __name__ == "__main__":
    main()
