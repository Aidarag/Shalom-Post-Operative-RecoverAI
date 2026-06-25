/**
 * Dynamically loads PDF.js from CDN and extracts text content from a PDF file.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if pdfjs is already loaded
    if ((window as any).pdfjsLib) {
      parsePdf((window as any).pdfjsLib, file, resolve, reject);
      return;
    }

    // Load pdf.js dynamically from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      // Configure workerSrc
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      parsePdf(pdfjsLib, file, resolve, reject);
    };
    script.onerror = () => {
      reject(new Error("Failed to load PDF parser library from CDN. Make sure you have an active internet connection."));
    };
    document.head.appendChild(script);
  });
}

function parsePdf(pdfjsLib: any, file: File, resolve: (text: string) => void, reject: (err: any) => void) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      resolve(fullText.trim());
    } catch (err) {
      reject(err);
    }
  };
  reader.onerror = () => {
    reject(new Error("Failed to read PDF file."));
  };
  reader.readAsArrayBuffer(file);
}
