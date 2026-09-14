import fetch from 'node-fetch';

async function run() {
    const resB = await fetch('http://localhost:8000/api/nz/buildings');
    const buildings = await resB.json();

    const resP = await fetch('http://localhost:8000/api/nz/parcels');
    const parcelsData = await resP.json();

    const resML = await fetch('http://localhost:8000/api/nz/ml-summary');
    const mlSummary = await resML.json();

    const resR = await fetch('http://localhost:8000/api/reviews');
    const reviews = await resR.json();

    console.log(Buildings: );
    console.log(Parcels: );
    console.log(ML Profiles: );
}
run();
