const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('<h1>Hello, World! CI/CD Pipeline v1.0</h1><p>This app was deployed by Jenkins!</p>');
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
