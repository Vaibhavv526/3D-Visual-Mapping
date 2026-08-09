import torch

from configs import DEVICE

from src.datasets.dataloader import get_dataloaders
from src.models.convnext import ConvNeXtModel
from src.models.feature_extractor import FeatureExtractor


def main():

    print("=" * 60)
    print("TESTING CONVNEXT FEATURE EXTRACTION")
    print("=" * 60)

    model = ConvNeXtModel()

    checkpoint = torch.load(
        "checkpoints/baseline_model.pth",
        map_location=DEVICE,
    )

    model.load_state_dict(
        checkpoint["model_state_dict"],
    )

    extractor = FeatureExtractor(
        model=model,
        device=DEVICE,
    )

    _, val_loader = get_dataloaders()

    features, targets = extractor.extract(
        val_loader,
    )

    print("\n✓ Feature extraction successful")

    print(
        f"Features Shape : {features.shape}"
    )

    print(
        f"Targets Shape  : {targets.shape}"
    )

    print(
        f"Feature Size   : {features.shape[1]}"
    )

    print(
        f"Samples        : {features.shape[0]}"
    )


if __name__ == "__main__":
    main()