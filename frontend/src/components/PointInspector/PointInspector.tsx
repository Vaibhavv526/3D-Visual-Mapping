export interface SelectedPoint {
    index: number;
    x: number;
    y: number;
    elevation: number;
    slope: number;
    ndvi: number;
}

interface PointInspectorProps {
    point: SelectedPoint | null;
}

export default function PointInspector({
    point
}: PointInspectorProps) {

    if (!point) {
        return null;
    }

    return (
        <div className="point-inspector">

            <div className="point-inspector-title">
                POINT INSPECTOR
            </div>

            <div className="point-row">
                <span>Vertex</span>
                <strong>{point.index}</strong>
            </div>

            <div className="point-row">
                <span>X</span>
                <strong>{point.x.toFixed(2)} m</strong>
            </div>

            <div className="point-row">
                <span>Y</span>
                <strong>{point.y.toFixed(2)} m</strong>
            </div>

            <div className="point-row">
                <span>Elevation</span>
                <strong>{point.elevation.toFixed(2)} m</strong>
            </div>

            <div className="point-row">
                <span>Slope</span>
                <strong>{point.slope.toFixed(2)}°</strong>
            </div>

            <div className="point-row">
                <span>NDVI</span>
                <strong>{point.ndvi.toFixed(3)}</strong>
            </div>

        </div>
    );
}
