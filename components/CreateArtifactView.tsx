
import React, { useState, useRef } from 'react';
import { Camera, Upload, Wand2, ArrowLeft, Save, X, Trash2, Info, Archive } from 'lucide-react';
import { DefaultCategory, CATEGORY_SUBCATEGORIES, CATEGORY_SPECS_TEMPLATES } from '../constants';
import { generateArtifactDescription } from '../services/geminiService';
import { fileToBase64 } from '../services/storageService';
import RetroLoader from './RetroLoader';

interface CreateArtifactViewProps {
  theme: 'dark' | 'light';
  onBack: () => void;
  onSave: (artifact: any) => void;
}

const CreateArtifactView: React.FC<CreateArtifactViewProps> = ({ theme, onBack, onSave }) => {
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(DefaultCategory.PHONES);
  const [subcategory, setSubcategory] = useState('');
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = [...images];
      for (let i = 0; i < e.target.files.length; i++) {
        const b64 = await fileToBase64(e.target.files[i]);
        newImages.push(b64);
      }
      setImages(newImages);
    }
  };

  const handleAiAnalyze = async () => {
    if (images.length === 0 && !title) {
      alert("Загрузите фото или введите название для запуска анализа");
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await generateArtifactDescription(images[0], title);
      if (result.title) setTitle(result.title);
      if (result.description) setDescription(result.description);
      if (result.category) setCategory(result.category);
      if (result.subcategory) setSubcategory(result.subcategory);
      if (result.specs) setSpecs(result.specs);
    } catch (error) {
      console.error(error);
      alert("Ошибка нейронного анализа. Проверьте соединение.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (asDraft: boolean = false) => {
    if (!title) {
      alert("Укажите название артефакта");
      return;
    }
    onSave({
      title,
      description,
      category,
      subcategory,
      imageUrls: images.length > 0 ? images : ['https://placehold.co/600x400?text=NO+IMAGE'],
      specs,
      isDraft: asDraft
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-32">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 font-pixel text-[10px] opacity-70 hover:opacity-100 uppercase tracking-widest">
          <ArrowLeft size={14} /> ОТМЕНА
        </button>
        <h2 className="font-pixel text-lg">НОВЫЙ_АРТЕФАКТ</h2>
      </div>

      <div className="space-y-6">
        {/* Media Preview / Upload */}
        <div className="space-y-4">
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 group">
                <img src={img} className="w-full h-full object-cover rounded-2xl border-2 border-white/10" />
                <button 
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`w-32 h-32 md:w-40 md:h-40 flex-shrink-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl transition-all ${theme === 'dark' ? 'border-white/10 hover:border-green-500/50 bg-white/5' : 'border-black/10 hover:border-black/30'}`}
            >
              <Camera size={28} />
              <span className="text-[10px] font-pixel">ДОБАВИТЬ_ФОТО</span>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
          </div>
          
          <button 
            onClick={handleAiAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-pixel text-xs tracking-[0.3em] transition-all ${isAnalyzing ? 'bg-white/10 opacity-50 cursor-wait' : 'bg-green-500 text-black hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] active:scale-95'}`}
          >
            {isAnalyzing ? <RetroLoader text="NEURAL_ANALYSIS_IN_PROGRESS" /> : <><Wand2 size={20} /> ЗАПУСТИТЬ НЕЙРОННЫЙ АНАЛИЗ</>}
          </button>
        </div>

        {/* Basic Metadata */}
        <div className={`p-8 rounded-3xl border ${theme === 'dark' ? 'bg-dark-surface border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Название экспоната</label>
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none transition-colors" 
                  placeholder="Введите название или модель..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Категория</label>
                  <select 
                    value={category} 
                    onChange={e => { setCategory(e.target.value); setSubcategory(''); }}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-green-500 outline-none appearance-none"
                  >
                    {Object.values(DefaultCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Подкатегория</label>
                  <select 
                    value={subcategory} 
                    onChange={e => setSubcategory(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm focus:border-green-500 outline-none appearance-none disabled:opacity-30"
                    disabled={!CATEGORY_SUBCATEGORIES[category]}
                  >
                    <option value="">Не выбрано</option>
                    {CATEGORY_SUBCATEGORIES[category]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-pixel opacity-50 uppercase tracking-widest mb-2 block">Описание и история</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={8}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 font-mono text-sm focus:border-green-500 outline-none resize-none leading-relaxed" 
                  placeholder="Опишите артефакт, его происхождение и значение для коллекции..."
                />
              </div>
            </div>

            {/* Specifications Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-pixel text-[11px] opacity-70 tracking-widest uppercase flex items-center gap-2">
                  <Info size={14} className="text-blue-400" /> ТЕХНИЧЕСКИЙ_ПАСПОРТ
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 bg-black/20 rounded-2xl border border-white/5">
                {(CATEGORY_SPECS_TEMPLATES[category] || ['Производитель', 'Год', 'Модель']).map(spec => (
                  <div key={spec}>
                    <label className="text-[9px] font-mono opacity-40 uppercase mb-1 block">{spec}</label>
                    <input 
                      value={specs[spec] || ''} 
                      onChange={e => setSpecs(prev => ({...prev, [spec]: e.target.value}))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 font-mono text-xs focus:border-green-500 outline-none transition-all"
                      placeholder={`Укажите ${spec}...`}
                    />
                  </div>
                ))}
                <p className="text-[9px] font-mono opacity-30 italic mt-2">
                  * Нейронный модуль автоматически распознает бренд, год выпуска и ключевые параметры при анализе фото.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <button 
            onClick={() => handleSubmit(false)}
            className="flex-1 py-5 bg-green-500 text-black rounded-2xl font-pixel text-sm tracking-[0.2em] hover:scale-[1.01] active:scale-95 transition-all shadow-[0_0_30px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 font-black"
          >
            <Save size={20} /> СОХРАНИТЬ В АРХИВ
          </button>
          <button 
            onClick={() => handleSubmit(true)}
            className="px-8 py-5 bg-white/5 border-2 border-white/10 rounded-2xl font-pixel text-[10px] opacity-60 hover:opacity-100 hover:bg-white/10 transition-all flex items-center justify-center gap-3 tracking-widest"
          >
            <Archive size={20} /> В ЧЕРНОВИКИ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArtifactView;
