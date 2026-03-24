import { useRef, useEffect, useState, useContext } from "react";
import { analyzeImage } from "../../services/nlpService";
import { AuthContext } from "../../context/AuthContext";

function CameraScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { user } = useContext(AuthContext);

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      alert("Camera permission denied");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png");

    setLoading(true);

    const res = await analyzeImage(imageData, user);

    setResult(res);
    setLoading(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">

      <h2 className="font-bold mb-3">📷 Scan Product</h2>

      <video
        ref={videoRef}
        autoPlay
        className="w-full rounded-lg"
      />

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={captureImage}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Capture & Analyze
      </button>

      {/* LOADING */}
      {loading && (
        <p className="mt-3 text-gray-500">Scanning...</p>
      )}

      {/* RESULT */}
      {result && (
        <div className="mt-4 border p-3 rounded">
          <h3 className="font-bold">{result.summary}</h3>
        </div>
      )}
    </div>
  );
}

export default CameraScanner;