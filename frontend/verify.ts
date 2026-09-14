async function run() {
    const resML = await fetch('http://localhost:8000/api/nz/ml/buildings');
    const mlSummary = await resML.json();
    let t = 0, m = 0, h = 0;
    mlSummary.profiles.forEach((p: any) => {
        if (p.classification === 'Typical') t++;
        if (p.classification === 'Moderately unusual') m++;
        if (p.classification === 'Highly unusual') h++;
    });
    console.log('Typical: ' + t);
    console.log('Moderately unusual: ' + m);
    console.log('Highly unusual: ' + h);
}
run();
