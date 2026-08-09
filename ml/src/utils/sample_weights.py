import numpy as np
import torch


def compute_sample_weights(
    dataframe,
):
    labels = dataframe.iloc[:, 2:-1].to_numpy(
        dtype=np.float32,
    )

    class_counts = labels.sum(
        axis=0,
    )

    class_weights = (
        len(labels)
        / (class_counts + 1e-6)
    )

    sample_weights = (
        labels * class_weights
    ).sum(axis=1)

    sample_weights = np.maximum(
        sample_weights,
        1.0,
    )

    return torch.as_tensor(
        sample_weights,
        dtype=torch.double,
    )