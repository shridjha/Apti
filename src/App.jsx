import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './app/Home';
import TopicView from './app/TopicView';
import PracticeFlow from './app/PracticeFlow';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:section" element={<TopicView />} />
        <Route path="/:section/practice" element={<PracticeFlow />} />
      </Routes>
    </Router>
  );
}

export default App;
