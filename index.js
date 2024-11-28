const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || '4000';

//app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render(
    'index', 
    { 
      title: 'Coming Soon!', 
      mainText: 'Spotify Unplayables', 
      subText: `Check the songs
      <br>You can't play anymore on Spotify`,
    }
    );
});

app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});