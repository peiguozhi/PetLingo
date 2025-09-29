import { motion } from 'framer-motion';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import { MicIcon, Volume2Icon } from 'lucide-react';
import { catAudioApi } from '@/services/api';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const CatAudio = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleRecord = async () => {
    if (!isRecording) {
      // 开始录音
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // 停止所有音频轨道
          stream.getTracks().forEach(track => track.stop());
          
          setIsLoading(true);
          setError(null);
          
          try {
            const analysisResult = await catAudioApi.analyzeRecording(audioBlob);
            setResult(analysisResult);
          } catch (error) {
            console.error("分析失败:", error);
            setError(error.message || "录音分析失败，请稍后重试");
            setResult(null);
          } finally {
            setIsLoading(false);
          }
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        
      } catch (error) {
        console.error('无法访问麦克风:', error);
        setError('无法访问麦克风，请确保已授权麦克风权限');
      }
    } else {
      // 停止录音
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      try {
        // 调用API进行分析
        const analysisResult = await catAudioApi.analyzeAudio(file);
        setResult(analysisResult);
      } catch (error) {
        console.error("分析失败:", error);
        setError(error.message || "音频分析失败，请稍后重试");
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 pt-8 relative overflow-hidden">
      {/* 动态背景音波效果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      {/* 音波线条背景 */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-gradient-to-r from-cyan-400 to-purple-400 h-px animate-pulse"
            style={{
              top: `${5 + i * 4.5}%`,
              left: '0',
              right: '0',
              animationDelay: `${i * 0.1}s`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
          >
            🎵 识别猫叫意图 🎵
          </motion.h1>
          <p className="text-xl text-cyan-200 max-w-2xl mx-auto font-light">
            🔊 上传或录制猫咪叫声，AI智能解析它想表达什么 🔊
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* 上传区域 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full border border-cyan-500/30 bg-slate-800/80 backdrop-blur-lg shadow-2xl shadow-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-cyan-300 flex items-center text-xl">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="mr-3"
                  >
                    <MicIcon className="h-6 w-6 text-cyan-400" />
                  </motion.div>
                  🎤 音频上传中心
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 文件上传 */}
                  <motion.div 
                    className="border-2 border-dashed border-cyan-400/50 rounded-xl p-8 text-center cursor-pointer hover:bg-cyan-900/30 transition-all duration-300 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      id="audio-upload"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center justify-center">
                        <motion.div
                          animate={{ 
                            y: [0, -10, 0],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        >
                          <Volume2Icon className="h-16 w-16 text-cyan-400 mb-4" />
                        </motion.div>
                        <p className="text-lg font-medium text-cyan-200 mb-2">
                          📁 点击上传音频文件
                        </p>
                        <p className="text-sm text-purple-300">
                          🎵 支持 MP3, WAV, AAC 格式
                        </p>
                      </div>
                    </label>
                  </motion.div>

                  {/* 录音按钮 */}
                  <div className="text-center">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleRecord}
                        disabled={isRecording || isLoading}
                        className={`${
                          isRecording
                            ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-500/30"
                            : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg shadow-cyan-500/30"
                        } text-white px-10 py-6 text-lg rounded-full border-2 border-white/20 backdrop-blur-sm`}
                      >
                        {isRecording ? (
                          <div className="flex items-center">
                            <motion.div 
                              className="w-4 h-4 bg-white rounded-full mr-3"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            🔴 录制中...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <MicIcon className="mr-3 h-6 w-6" />
                            🎙️ 录制猫咪叫声
                          </div>
                        )}
                      </Button>
                    </motion.div>
                    {isRecording && (
                      <motion.div 
                        className="mt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleRecord}
                            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-8 py-4 rounded-full shadow-lg shadow-red-500/30 border-2 border-white/20"
                          >
                            ⏹️ 停止录音
                          </Button>
                        </motion.div>
                        <motion.p 
                          className="mt-4 text-cyan-200 font-medium"
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          🎵 正在录制...请让猫咪对着麦克风叫一声 🎵
                        </motion.p>
                        {/* 音波可视化效果 */}
                        <div className="flex justify-center items-center mt-4 space-x-1">
                          {[...Array(8)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-gradient-to-t from-cyan-400 to-purple-400 rounded-full"
                              animate={{
                                height: [10, 30, 10, 25, 15, 35, 20, 10]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeInOut"
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* 错误信息显示 */}
                  {error && (
                    <motion.div 
                      className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl backdrop-blur-sm shadow-lg shadow-red-500/20"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-red-300 font-medium">❌ 错误: {error}</p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 结果显示区域 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full border border-purple-500/30 bg-slate-800/80 backdrop-blur-lg shadow-2xl shadow-purple-500/20">
              <CardHeader>
                <CardTitle className="text-purple-300 flex items-center text-xl">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="mr-3"
                  >
                    🧠
                  </motion.div>
                  AI 分析结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <motion.div 
                      className="relative mb-6"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-16 h-16 border-4 border-cyan-500/30 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin"></div>
                    </motion.div>
                    <motion.p 
                      className="text-cyan-200 font-medium text-lg"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      🔍 AI正在分析猫咪叫声...
                    </motion.p>
                    <div className="flex justify-center items-center mt-4 space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3]
                          }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : result ? (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div 
                      className="bg-gradient-to-br from-cyan-900/40 to-purple-900/40 rounded-xl p-6 border border-cyan-400/30 backdrop-blur-sm shadow-lg shadow-cyan-500/10"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center">
                        🎯 猫咪意图识别结果
                      </h3>
                      <div className="flex items-center mb-4">
                        <motion.div 
                          className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mr-4"
                          animate={{ 
                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: 'linear' 
                          }}
                        >
                          {result.intent}
                        </motion.div>
                        <motion.div 
                          className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-4 py-2 rounded-full border border-cyan-400/30"
                          animate={{ 
                            boxShadow: ['0 0 10px rgba(34, 211, 238, 0.3)', '0 0 20px rgba(168, 85, 247, 0.3)', '0 0 10px rgba(34, 211, 238, 0.3)']
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="text-cyan-200 font-medium">
                            🎯 置信度: {result.confidence}%
                          </span>
                        </motion.div>
                      </div>
                      <p className="text-purple-200 leading-relaxed">{result.description}</p>
                    </motion.div>

                    <motion.div 
                      className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-6 border border-purple-400/30 backdrop-blur-sm shadow-lg shadow-purple-500/10"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h4 className="font-bold text-purple-300 mb-4 flex items-center text-lg">
                        💡 建议行动
                      </h4>
                      <ul className="space-y-3 text-pink-200">
                        {result.intent === "饿了" && (
                          <>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <span className="text-yellow-400 mr-2">🍽️</span>
                              检查猫咪的食盆是否需要添加食物
                            </motion.li>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <span className="text-green-400 mr-2">⏰</span>
                              确认喂食时间是否规律
                            </motion.li>
                          </>
                        )}
                        {(result.intent === "撒娇" || result.intent === "友好呼唤" || result.intent === "想玩耍") && (
                          <>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <span className="text-pink-400 mr-2">💕</span>
                              花一些时间陪伴和抚摸猫咪
                            </motion.li>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <span className="text-blue-400 mr-2">🎮</span>
                              与猫咪进行互动游戏
                            </motion.li>
                          </>
                        )}
                        {result.intent === "警告" && (
                          <>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <span className="text-red-400 mr-2">⚠️</span>
                              给猫咪一些空间，不要强行接近
                            </motion.li>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <span className="text-orange-400 mr-2">🔍</span>
                              检查是否有让猫咪感到威胁的因素
                            </motion.li>
                          </>
                        )}
                        {result.intent === "着急" && (
                          <>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                            >
                              <span className="text-yellow-400 mr-2">👀</span>
                              观察猫咪是否在寻找什么
                            </motion.li>
                            <motion.li 
                              className="flex items-start"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <span className="text-brown-400 mr-2">🧹</span>
                              检查猫砂盆是否需要清理
                            </motion.li>
                          </>
                        )}
                        <motion.li 
                          className="flex items-start"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <span className="text-cyan-400 mr-2">📊</span>
                          观察猫咪的其他行为信号
                        </motion.li>
                      </ul>
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Volume2Icon className="h-16 w-16 text-teal-400 mb-4" />
                    <h3 className="text-xl font-medium text-teal-700 mb-2">
                      等待分析
                    </h3>
                    <p className="text-teal-600">
                      上传或录制猫咪叫声后，分析结果将显示在这里
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CatAudio;
