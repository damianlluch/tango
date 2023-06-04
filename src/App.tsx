import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import Loader from './components/Loader';
import { drawEmoji } from './utils/drawEmoji';
import './styles/keyboard.css';
import { initialLetters } from "./utils/initialLetters";
import './styles/webcam.css';

const App = () => {

  const [letters, setLetters] = useState<string[]>(initialLetters);
  const [leftSection, setLeftSection] = useState<string[]>([]);
  const [rightSection, setRightSection] = useState<string[]>([]);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentExpression, setCurrentExpression] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [webcamEnabled, setWebcamEnabled] = useState<boolean>(false);

  const loadModels = async () => {
    const modelUrl = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.load(modelUrl),
      faceapi.nets.faceExpressionNet.load(modelUrl),
    ]);
  };

  const initKeyboardUI = (lettersSelected: string[], update: boolean) => {
    if (update) {
      setLeftSection(
          lettersSelected.slice(0, Math.round(lettersSelected.length / 2))
      );
      setRightSection(
          lettersSelected.slice(Math.round(lettersSelected.length / 2))
      );
    }
    if (lettersSelected.length === 1) {
      const outputElement = outputRef.current;
      if (outputElement) {
        if (lettersSelected[0] === 'Delete') {
          outputElement.value = outputElement.value.slice(0, -1);
        } else if (lettersSelected[0] === 'space') {
          outputElement.value += ' ';
        } else if (lettersSelected[0] === 'Enter') {
          outputElement.value += '\n';
        } else {
          outputElement.value += lettersSelected[0];
        }
      }
      setLetters(initialLetters);
      initKeyboardUI(initialLetters, true); // this will reset the keyboard
      return;
    }
  };

  useEffect(() => {
    initKeyboardUI(letters, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadWaiting = async () => {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        const conditions = (
            webcamRef.current &&
            webcamRef.current.video &&
            webcamRef.current.video.readyState === 4
        );

        if (conditions) {
          resolve(true);
          clearInterval(timer);
        }
      }, 500);
    });
  };

  const faceDetectHandler = async () => {
    await loadModels();
    await handleLoadWaiting();

    const refConditions = (canvasRef.current && webcamRef.current);

    if (refConditions && webcamRef.current.video) {
      setIsLoaded(true);

      const webcam = webcamRef.current.video;
      webcam.width = webcam.videoWidth;
      webcam.height = webcam.videoHeight;

      const canvas = canvasRef.current;
      canvas.width = webcam.videoWidth;
      canvas.height = webcam.videoHeight;

      const video = webcamRef.current.video;

      const draw = async () => {
        if (video) {
          const detectionsWithExpressions = await faceapi.detectAllFaces(
              video,
              new faceapi.TinyFaceDetectorOptions(),
          ).withFaceExpressions();

          if (refConditions && detectionsWithExpressions.length) {
            const dominantExpression = await drawEmoji({ detectionsWithExpressions, canvas: canvasRef.current });
            setCurrentExpression(dominantExpression);
          }

          requestAnimationFrame(draw);
        }
      };

      draw();
    }
  };

  const renderWebcam = () => (
      <div className="webcam-container">
        <Webcam audio={false} ref={webcamRef} className={!isLoaded ? 'video' : 'video frame'} />
        <canvas ref={canvasRef} className='video' />
      </div>
  )

  useEffect(() => {
    if (webcamEnabled) {
      setIsLoaded(false);
      faceDetectHandler();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamEnabled]);

  useEffect(() => {
    if (currentExpression === 'happy') {
      initKeyboardUI(rightSection, true);
    } else if (currentExpression === 'angry') {
      initKeyboardUI(leftSection, true);
    } else if (currentExpression === 'surprised') {
      const outputElement = outputRef.current;
      if (outputElement) {
        outputElement.value = outputElement.value.slice(0, -1);
      }
    }
  }, [currentExpression]);

  useEffect(() => {
    if (letters.length === 1) {
      setLetters(initialLetters);
    }
  }, [letters]);




  return (
      <div className='container'>
        <header className='header'>
          <h1>Tango Keyboard</h1>
          <h3>Eleccion del lado izquierdo del teclado con gesto alegre</h3>
          <h3>Eleccion del lado derecho del teclado con gesto enojado</h3>
          <h3>Borrar ultima letra con gesto de sorpresa</h3>
          &nbsp;
          <label className='switch'>
            <input type='checkbox' checked={webcamEnabled} onClick={() => setWebcamEnabled((previous) => !previous)} />
            <span className='slider' />
          </label>
        </header>

        <Loader />

        <main className='main'>
          {webcamEnabled && renderWebcam()}

          <section className="letters">
            <section className="section-left">
              {leftSection.map(letter => (
                  <p key={letter}>{letter}</p>
              ))}
            </section>
            <section className="section-right">
              {rightSection.map(letter => (
                  <p key={letter}>{letter}</p>
              ))}
            </section>
          </section>

          <textarea
              ref={outputRef}
              className="output"
              placeholder="Type a message with your eyes..."
              cols={30}
              rows={1}
              readOnly
          />
        </main>

        <footer>
          <p>
            Created by Joseph Perez - <a href='https://www.github.com/p14/emoji-mask' target='_blank' rel='noreferrer'>Source Code</a>
          </p>
        </footer>
      </div>
  );
}

export default App;
