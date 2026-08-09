import torch

from sklearn.metrics import f1_score

from src.metrics.threshold_optimizer import ThresholdOptimizer


def main():

    predictions = torch.load(
        "validation_predictions.pt"
    )

    targets = torch.load(
        "validation_targets.pt"
    )

    thresholds = ThresholdOptimizer.find_best_thresholds(
        predictions,
        targets,
    )

    print("\nBest Thresholds")
    print("=" * 40)

    for index, threshold in enumerate(
        thresholds
    ):

        print(
            f"Class {index}: {threshold:.2f}"
        )

    original_predictions = (
        torch.sigmoid(
            predictions,
        )
        > 0.5
    ).int()

    original_f1 = f1_score(
        targets.numpy(),
        original_predictions.numpy(),
        average="macro",
        zero_division=0,
    )

    optimized_f1 = (
        ThresholdOptimizer.evaluate_thresholds(
            predictions,
            targets,
            thresholds,
        )
    )

    print("\n" + "=" * 40)

    print(
        f"Original Macro F1 : "
        f"{original_f1:.4f}"
    )

    print(
        f"Optimized Macro F1: "
        f"{optimized_f1:.4f}"
    )

    print(
        f"Improvement        : "
        f"{optimized_f1 - original_f1:+.4f}"
    )


if __name__ == "__main__":
    main()