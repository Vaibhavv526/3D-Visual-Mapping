import torch

from xgboost import XGBClassifier


NUM_LABELS = 10


def main():

    print("=" * 60)
    print("XGBOOST ON CONVNEXT FEATURES")
    print("=" * 60)

    train_data = torch.load(
        "train_features.pt",
        weights_only=False,
    )

    val_data = torch.load(
        "val_features.pt",
        weights_only=False,
    )

    X_train = train_data["features"].numpy()
    y_train = train_data["targets"].numpy()

    X_val = val_data["features"].numpy()
    y_val = val_data["targets"].numpy()

    print(
        f"\nTrain Features : {X_train.shape}"
    )

    print(
        f"Validation Features : {X_val.shape}"
    )

    models = []

    predictions = []

    for class_index in range(NUM_LABELS):

        print(
            f"\nTraining Class {class_index}..."
        )

        model = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="binary:logistic",
            eval_metric="logloss",
            tree_method="hist",
            random_state=42,
        )

        model.fit(
            X_train,
            y_train[:, class_index],
        )

        class_predictions = model.predict_proba(
            X_val
        )[:, 1]

        models.append(model)

        predictions.append(
            class_predictions
        )

    predictions = torch.tensor(
        predictions,
        dtype=torch.float32,
    ).T

    targets = torch.tensor(
        y_val,
        dtype=torch.float32,
    )

    torch.save(
        {
            "predictions": predictions,
            "targets": targets,
        },
        "xgboost_predictions.pt",
    )

    print("\n✓ XGBoost training completed")

    print(
        f"Prediction Shape : {predictions.shape}"
    )

    print(
        f"Target Shape     : {targets.shape}"
    )


if __name__ == "__main__":
    main()