import torch


class FeatureExtractor:

    def __init__(
        self,
        model,
        device,
    ):

        self.model = model.to(device)

        self.device = device

        self.model.eval()

    def extract(
        self,
        dataloader,
    ):

        all_features = []

        all_targets = []

        with torch.no_grad():

            for batch in dataloader:

                images = batch["image"].to(
                    self.device,
                )

                features = self.model.backbone(
                    images,
                )

                all_features.append(
                    features.cpu(),
                )

                all_targets.append(
                    batch["labels"].cpu(),
                )

        features = torch.cat(
            all_features,
            dim=0,
        )

        targets = torch.cat(
            all_targets,
            dim=0,
        )

        return features, targets