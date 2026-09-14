async function run() {
    const resML = await fetch('http://localhost:8000/api/nz/ml-summary');
    const mlSummary = await resML.json();
    console.log(Object.keys(mlSummary));
}
run();
