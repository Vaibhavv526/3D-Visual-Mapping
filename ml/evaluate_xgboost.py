import torch

from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
)


def evaluate(
    predictions,
    targets,
    thresholds,
):

    predicted_labels = (
        predictions > thresholds
    ).int()

    predictions_np = predicted_labels.numpy()
    targets_np = targets.numpy()

    f1 = f1_score(
        targets_np,
        predictions_np,
        average="macro",
        zero_division=0,
    )

    precision = precision_score(
        targets_np,
        predictions_np,
        average="macro",
        zero_division=0,
    )

    recall = recall_score(
        targets_np,
        predictions_np,
        average="macro",
        zero_division=0,
    )

    return f1, precision, recall


def main():

    data = torch.load(
        "xgboost_predictions.pt",
        weights_only=False,
    )

    predictions = data["predictions"]

    targets = data["targets"]

    thresholds = torch.tensor(
        [
            0.65,
            0.25,
            0.25,
            0.65,
            0.50,
            0.65,
            0.90,
            0.65,
            0.65,
            0.85,
        ],
        dtype=torch.float32,
    )

    f1, precision, recall = evaluate(
        predictions,
        targets,
        thresholds,
    )

    print("=" * 60)
    print("XGBOOST EVALUATION")
    print("=" * 60)

    print(
        f"\nMacro F1   : {f1:.4f}"
    )

    print(
        f"Precision  : {precision:.4f}"
    )

    print(
        f"Recall     : {recall:.4f}"
    )

    print("\nBaseline Macro F1 : 0.4845")

    print(
        f"XGBoost Improvement : "
        f"{f1 - 0.4845:+.4f}"
    )


if __name__ == "__main__":
    main()