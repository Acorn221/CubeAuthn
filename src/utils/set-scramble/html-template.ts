/**
 * Create downloadable HTML with hash information and cube visualization
 * Using a black and white theme
 */
export const createDownloadableHTML = (
  hash: string,
  iterations: number,
  salt: string,
  cubeNum: string,
  frontSvgContent: string,
  backSvgContent: string
): string => {
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rubik's Cube Authentication</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #000;
      color: #fff;
      min-height: 100vh;
    }
    .container {
      background-color: #111;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5em;
      border-bottom: 1px solid #333;
      padding-bottom: 15px;
    }
    h2 {
      margin-top: 30px;
      border-left: 4px solid #fff;
      padding-left: 10px;
    }
    .cube-container {
      margin: 20px 0;
      text-align: center;
      background-color: #222;
      padding: 20px;
      border-radius: 10px;
    }
    .cube-views {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
    }
    .cube-view {
      flex: 1;
      min-width: 300px;
      border: 1px solid #333;
      padding: 15px;
      border-radius: 8px;
    }
    .cube-view h3 {
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 1.2em;
      color: #ccc;
    }
    .hash-details {
      background-color: #000;
      padding: 20px;
      border-radius: 10px;
      font-family: monospace;
      overflow-wrap: break-word;
      margin-top: 20px;
      border: 1px solid #333;
    }
    .hash-details p {
      margin: 10px 0;
      line-height: 1.5;
    }
    .hash-details strong {
      color: #ccc;
      display: inline-block;
      width: 120px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 0.9em;
      opacity: 0.6;
      border-top: 1px solid #333;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Rubik's Cube Authentication</h1>
    <p>This document contains your cube scramble information for WebAuthn authentication.</p>
    
    <h2>Cube Visualization</h2>
    <div class="cube-container">
      <div class="cube-views">
        <div class="cube-view">
          <h3>Front View</h3>
          ${frontSvgContent}
        </div>
        <div class="cube-view">
          <h3>Back View</h3>
          ${backSvgContent}
        </div>
      </div>
    </div>
    
    <h2>Authentication Details</h2>
    <div class="hash-details">
      <p><strong>Cube State:</strong> ${cubeNum}</p>
      <p><strong>Algorithm:</strong> PBKDF2-SHA512</p>
      <p><strong>Hash:</strong> ${hash}</p>
      <p><strong>Salt:</strong> ${salt}</p>
      <p><strong>Iterations:</strong> ${iterations.toLocaleString()}</p>
      <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <p class="footer">Keep this information secure. You'll need your physical cube in the same configuration for authentication.</p>
  </div>
</body>
</html>
  `;
  
  return htmlContent;
};