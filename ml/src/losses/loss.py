import torch
import torch.nn as nn


class FocalBCELoss(nn.Module):

    def __init__(
        self,
        gamma=2.0,
        pos_weight=None,
    ):

        super().__init__()

        self.gamma = gamma
        self.pos_weight = pos_weight

    def forward(
        self,
        logits,
        targets,
    ):

        bce_loss = nn.functional.binary_cross_entropy_with_logits(
            logits,
            targets,
            pos_weight=self.pos_weight,
            reduction="none",
        )

        probabilities = torch.sigmoid(
            logits,
        )

        pt = (
            targets * probabilities
            + (1 - targets)
            * (1 - probabilities)
        )

        focal_weight = (
            1 - pt
        ) ** self.gamma

        loss = (
            focal_weight * bce_loss
        )

        return loss.mean()


class MultiTaskLoss(nn.Module):

    def __init__(
        self,
        pos_weight=None,
    ):

        super().__init__()

        self.defect_loss = FocalBCELoss(
            gamma=2.0,
            pos_weight=pos_weight,
        )

        self.quality_loss = nn.BCEWithLogitsLoss()

    def forward(
        self,
        defect_logits,
        defect_targets,
        quality_logits,
        quality_targets,
    ):

        defect_loss = self.defect_loss(
            defect_logits,
            defect_targets,
        )

        quality_loss = self.quality_loss(
            quality_logits,
            quality_targets.unsqueeze(1),
        )

        total_loss = (
            defect_loss
            + 0.5 * quality_loss
        )

        return total_loss