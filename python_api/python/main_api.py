
"""Run locally:
  cd D:/Desktop/hackthon/DogAndCat/code
  # (activate your venv)
  pip install fastapi uvicorn python-multipart
  # (plus your existing requirements)
  uvicorn main_api:app --host 0.0.0.0 --port 8000 --reload

Docs:  http://127.0.0.1:8000/docs
Form:  http://127.0.0.1:8000/
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from typing import Optional
import tempfile
import os
import traceback

# 确保 predict.py 和本文件同目录，并且包含 AudioEmotionPredictor
from predict import AudioEmotionPredictor

app = FastAPI(title="Cat & Dog Voice Emotion API", version="0.1.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor: Optional[AudioEmotionPredictor] = None

@app.on_event("startup")
def _load_model_once():
    global predictor
    try:
        predictor = AudioEmotionPredictor()
        predictor.load_model()  # 默认从 ../models 读取
    except Exception as e:
        traceback.print_exc()
        raise RuntimeError(f"Failed to initialize predictor: {e}")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/labels")
def labels():
    global predictor
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "animal_labels": getattr(predictor, "animal_labels", None),
        "emotion_labels": getattr(predictor, "emotion_labels", None),
        "emotion_name_map": getattr(predictor, "emotion_name_map", None),
    }

@app.get("/")
def index():
    html = """
    <html>
    <head><title>Upload audio</title></head>
    <body>
      <h3>Upload a cat/dog audio (.m4a/.wav)</h3>
      <form action="/predict" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept="audio/*" required />
        <button type="submit">Predict</button>
      </form>
      <p>API docs: <a href="/docs">/docs</a></p>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

def _normalize_output(res):
    """
    把任意返回值转成 JSON 友好结构：
    - dict 或 list[dict]：直接返回
    - (label, prob) / [label, prob]：转成 {label, confidence, raw}
    - 其他：包在 {"result": ...} 里
    """
    if isinstance(res, dict):
        return res
    if isinstance(res, list) and (len(res) == 0 or isinstance(res[0], dict)):
        return res
    if isinstance(res, (list, tuple)) and len(res) >= 2 and isinstance(res[0], str):
        label = res[0]
        conf = None
        try:
            conf = float(res[1])
        except Exception:
            pass
        return {"label": label, "confidence": conf, "raw": jsonable_encoder(res)}
    if isinstance(res, (str, int, float)):
        return {"result": res}
    return {"result": jsonable_encoder(res)}

@app.post("/predict")
def predict_api(file: UploadFile = File(...)):
    global predictor
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not ready")

    MAX_SIZE = 20 * 1024 * 1024  # 20MB
    try:
        contents = file.file.read()
        if len(contents) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read upload")

    suffix = os.path.splitext(file.filename or "upload")[1]
    if suffix == "":
        suffix = ".m4a"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # 注意：不再传 return_json / top_k
        raw_result = predictor.predict_emotion(tmp_path)
        result = _normalize_output(raw_result)
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass

@app.post("/translate")
def translate_api(file: UploadFile = File(...)):
    """翻译接口：识别输入音频的动物类型和情绪，返回对应的翻译音频文件路径"""
    global predictor
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not ready")

    MAX_SIZE = 20 * 1024 * 1024  # 20MB
    try:
        contents = file.file.read()
        if len(contents) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read upload")

    suffix = os.path.splitext(file.filename or "upload")[1]
    if suffix == "":
        suffix = ".m4a"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # 预测情绪
        prediction_result = predictor.predict_emotion(tmp_path)
        
        if not prediction_result.get('success', False):
            raise HTTPException(status_code=500, detail=prediction_result.get('error', 'Prediction failed'))
        
        # 获取预测结果
        animal = prediction_result['animal']
        emotion = prediction_result['emotion']
        confidence = prediction_result['confidence']
        
        # 确定目标动物类型（翻译逻辑：猫->狗，狗->猫）
        target_animal = 'dog' if animal == 'cat' else 'cat'
        target_animal_cn = '狗' if animal == 'cat' else '猫'
        
        # 构建音频文件路径
        voice_dir = os.path.join('..', '..', 'voice(1)')
        if target_animal == 'cat':
            audio_folder = 'Catvoice'
        else:
            audio_folder = 'Dogvoice'
        
        audio_filename = f"{target_animal_cn}_{emotion}.m4a"
        audio_path = os.path.join(voice_dir, audio_folder, audio_filename)
        
        # 检查音频文件是否存在
        if not os.path.exists(audio_path):
            # 如果找不到对应情绪的音频，尝试一些通用的情绪映射
            emotion_mapping = {
                '兴奋捕猎': ['兴奋', '捕猎', '活跃'],
                '友好呼唤': ['友好', '呼唤', '打招呼'],
                '撒娇': ['撒娇', '可爱', '亲昵'],
                '警告': ['警告', '威胁', '生气'],
                '饿了': ['饿了', '要食物', '饥饿'],
                '着急': ['着急', '焦虑', '不安'],
                '求偶': ['求偶', '发情'],
                '哀求': ['哀求', '请求', '委屈']
            }
            
            # 尝试找到相似的情绪
            found_audio = None
            for available_emotion, similar_emotions in emotion_mapping.items():
                if emotion in similar_emotions:
                    test_filename = f"{target_animal_cn}_{available_emotion}.m4a"
                    test_path = os.path.join(voice_dir, audio_folder, test_filename)
                    if os.path.exists(test_path):
                        audio_path = test_path
                        audio_filename = test_filename
                        found_audio = available_emotion
                        break
            
            if not found_audio:
                # 如果还是找不到，使用默认音频（如果存在）
                default_emotions = ['打招呼', '撒娇', '友好呼唤']
                for default_emotion in default_emotions:
                    default_filename = f"{target_animal_cn}_{default_emotion}.m4a"
                    default_path = os.path.join(voice_dir, audio_folder, default_filename)
                    if os.path.exists(default_path):
                        audio_path = default_path
                        audio_filename = default_filename
                        break
        
        # 构建返回结果
        result = {
            'success': True,
            'original_animal': animal,
            'original_emotion': emotion,
            'original_emotion_name': prediction_result.get('emotion_name', emotion),
            'confidence': confidence,
            'target_animal': target_animal,
            'target_animal_name': target_animal_cn,
            'audio_filename': audio_filename,
            'audio_path': audio_path,
            'translation': f"这是一只{animal}的{emotion}声音，翻译成{target_animal_cn}语就是这样的",
            'description': f"检测到{animal}的{emotion}情绪（置信度：{confidence:.2f}），为您播放对应的{target_animal_cn}语音频"
        }
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass

@app.get("/audio/{filename}")
def get_audio_file(filename: str):
    """获取音频文件"""
    try:
        # 构建音频文件路径
        voice_dir = os.path.join('..', '..', 'voice(1)')
        
        # 根据文件名判断是猫还是狗的音频
        if filename.startswith('猫_'):
            audio_folder = 'Catvoice'
        elif filename.startswith('狗_'):
            audio_folder = 'Dogvoice'
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        audio_path = os.path.join(voice_dir, audio_folder, filename)
        
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        return FileResponse(
            path=audio_path,
            media_type="audio/m4a",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to serve audio file: {e}")

