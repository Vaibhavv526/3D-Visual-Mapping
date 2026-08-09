import torch

from configs import DEVICE

from src.datasets.dataloader import get_dataloaders
from src.models.convnext import ConvNeXtModel
from src.models.feature_extractor import FeatureExtractor


def main():

    print("=" * 60)
    print("EXTRACTING CONVNEXT FEATURES")
    print("=" * 60)

    model = ConvNeXtModel()

    checkpoint = torch.load(
        "checkpoints/baseline_model.pth",
        map_location=DEVICE,
    )

    model.load_state_dict(
        checkpoint["model_state_dict"],
    )

    print("\n✓ Baseline model loaded")

    extractor = FeatureExtractor(
        model=model,
        device=DEVICE,
    )

    train_loader, val_loader = get_dataloaders()

    print("\nExtracting training features...")

    train_features, train_targets = (
        extractor.extract(train_loader)
    )

    print(
        f"Train Features : {train_features.shape}"
    )

    print(
        f"Train Targets  : {train_targets.shape}"
    )

    print("\nExtracting validation features...")

    val_features, val_targets = (
        extractor.extract(val_loader)
    )

    print(
        f"Val Features   : {val_features.shape}"
    )

    print(
        f"Val Targets    : {val_targets.shape}"
    )

    torch.save(
        {
            "features": train_features,
            "targets": train_targets,
        },
        "train_features.pt",
    )

    torch.save(
        {
            "features": val_features,
            "targets": val_targets,
        },
        "val_features.pt",
    )

    print("\n✓ Features saved successfully")


if __name__ == "__main__":
    main()