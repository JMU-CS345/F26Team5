// Loads a picture without using fetch. p5's loadImage uses fetch, which browsers block when
// the page is opened straight from disk (file://), so no art would show up. A plain <img>
// works both from disk and from a web server. Use it like loadImage: await loadImageFile(path).
function loadImageFile(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const picture = createImage(img.width, img.height);
      picture.drawingContext.drawImage(img, 0, 0);
      resolve(picture);
    };
    img.onerror = () => reject(new Error("Could not load image: " + path));
    img.src = path;
  });
}
