import torch
import pandas as pd

from torch.utils.data import DataLoader
from torch.utils.data._utils.collate import default_collate

from configs import (
    DEVICE,
    TEST_DIR,
    BEST_THRESHOLDS,
    BATCH_SIZE,
    NUM_WORKERS,
)

from src.models.convnext import ConvNeXtModel
from src.datasets.mesh_dataset import MeshDataset
from src.datasets.transforms import get_val_transforms


def load_model(checkpoint_path):

    model = ConvNeXtModel()

    checkpoint = torch.load(
        checkpoint_path,
        map_location=DEVICE,
    )

    model.load_state_dict(
        checkpoint["model_state_dict"],
    )

    model.to(DEVICE)

    model.eval()

    return model

def test_collate_fn(batch):

    images = default_collate(
        [item["image"] for item in batch]
    )

    item_ids = [
        item["item_id"]
        for item in batch
    ]

    return {
        "image": images,
        "item_id": item_ids,
    }
def main():

    print("=" * 60)
    print("GENERATING TEST SUBMISSION")
    print("=" * 60)

    test_df = pd.read_csv(
        "data/test.csv"
    )

    test_dataset = MeshDataset(
        dataframe=test_df,
        dataset_dir=TEST_DIR,
        image_transform=get_val_transforms(),
        mode="image",
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
        collate_fn=test_collate_fn,
    )

    print(
        f"\nTest Samples : {len(test_dataset)}"
    )

    model = load_model(
        "checkpoints/baseline_model.pth"
    )

    print("\n✓ Model Loaded")

    thresholds = torch.tensor(
        BEST_THRESHOLDS,
        device=DEVICE,
    )

    all_predictions = []

    all_quality = []

    all_item_ids = []

    with torch.no_grad():

        for batch in test_loader:

            images = batch["image"].to(
                DEVICE,
                non_blocking=True,
            )

            defect_logits, quality_logits = model(
                images
            )

            defect_probs = torch.sigmoid(
                defect_logits
            )

            quality_probs = torch.sigmoid(
                quality_logits
            )

            defect_predictions = (
                defect_probs > thresholds
            ).int()

            quality_predictions = (
                quality_probs > 0.5
            ).int()

            all_predictions.append(
                defect_predictions.cpu()
            )

            all_quality.append(
                quality_predictions.cpu()
            )

            all_item_ids.extend(
                batch["item_id"]
            )

    predictions = torch.cat(
        all_predictions,
        dim=0,
    ).numpy()

    quality = torch.cat(
        all_quality,
        dim=0,
    ).numpy().reshape(-1)

    submission = pd.DataFrame(
        predictions,
        columns=[
            "abstract",
            "artifacts",
            "intersection",
            "lowpoly",
            "noisy",
            "open",
            "partial",
            "scale",
            "set",
            "simple",
        ],
    )

    submission.insert(
        0,
        "item_id",
        all_item_ids,
    )

    submission["quality"] = quality

    submission.to_csv(
        "submission.csv",
        index=False,
    )

    print("\n✓ Submission saved")
    print(
        f"Shape : {submission.shape}"
    )

    print("\nClass Distribution:")

    print(
        submission.iloc[:, 1:].sum()
    )

    print("\nFirst 5 rows:")
    print(
        submission.head()
    )


if __name__ == "__main__":
    main()