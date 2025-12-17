import React, { useState, useEffect } from 'react';
import { 
  Ship, LayoutDashboard, PlusCircle, Search, Anchor, 
  MapPin, AlertTriangle, FileText, BarChart3, LogOut, 
  CheckCircle, ExternalLink, Users, Settings, Printer, X, Trash2, Ruler, Hammer, Send,
  CalendarCheck, ShieldCheck, Activity, RefreshCw, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShipData, SearchResult, InspectionData, Surveyor, ClassSocietyData } from '../types';
import { searchShipData, analyzeClassPerformance } from '../services/geminiService';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [ships, setShips] = useState<ShipData[]>([]);
  const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
  const [classSocieties, setClassSocieties] = useState<ClassSocietyData[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'lookup' | 'list' | 'surveyors' | 'class_perf' | 'settings'>('overview');
  const [selectedShip, setSelectedShip] = useState<ShipData | null>(null);
  
  // Lookup State
  const [lookupName, setLookupName] = useState('');
  const [lookupIMO, setLookupIMO] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');

  // Class Performance State
  const [newClassName, setNewClassName] = useState('');
  const [isClassAnalyzing, setIsClassAnalyzing] = useState(false);
  const [showClassReport, setShowClassReport] = useState(false);

  // Inspection State
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [newInspection, setNewInspection] = useState<Partial<InspectionData>>({
    inspectorName: '',
    location: '',
    deficienciesFound: 0,
    detained: false,
    comments: ''
  });

  // Surveyor State
  const [newSurveyor, setNewSurveyor] = useState<Partial<Surveyor>>({ name: '', location: '', email: '', phone: '', company: '' });
  const [selectedSurveyorForLetter, setSelectedSurveyorForLetter] = useState<Surveyor | null>(null);
  const [letterShipId, setLetterShipId] = useState<string>('');

  // Settings State
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedShips = localStorage.getItem('maj_ships_db');
    if (savedShips) setShips(JSON.parse(savedShips));

    const savedSurveyors = localStorage.getItem('maj_surveyors_db');
    if (savedSurveyors) setSurveyors(JSON.parse(savedSurveyors));

    const savedClasses = localStorage.getItem('maj_classes_db');
    if (savedClasses) setClassSocieties(JSON.parse(savedClasses));
    else {
      // Default classes seed if empty
      const defaultClasses = [
        { name: 'DNV', id: '1' }, { name: 'ABS', id: '2' }, { name: 'Lloyds Register', id: '3' },
        { name: 'Bureau Veritas', id: '4' }, { name: 'ClassNK', id: '5' }
      ];
      // Note: These need to be analyzed to populate full data, but we start with names
      // We won't auto-analyze on load to save API calls, user must click 'refresh'.
      const seeded: ClassSocietyData[] = defaultClasses.map(c => ({
         id: c.id, 
         name: c.name, 
         pscData: [], 
         trend: 'Steady', 
         trendReason: 'Pending Analysis', 
         lastUpdated: new Date().toISOString() 
      }));
      setClassSocieties(seeded);
    }
  }, []);

  // Save data to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('maj_ships_db', JSON.stringify(ships));
  }, [ships]);

  useEffect(() => {
    localStorage.setItem('maj_surveyors_db', JSON.stringify(surveyors));
  }, [surveyors]);

  useEffect(() => {
    localStorage.setItem('maj_classes_db', JSON.stringify(classSocieties));
  }, [classSocieties]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupName || !lookupIMO) return;
    
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);
    
    try {
      const result = await searchShipData(lookupName, lookupIMO);
      if (result) {
        setSearchResult(result);
      } else {
        setSearchError('No data found for this vessel. Please check the credentials.');
      }
    } catch (err) {
      setSearchError('Failed to connect to vessel database services. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const registerShip = () => {
    if (!searchResult) return;
    
    const newShip: ShipData = {
      id: searchResult.imo,
      name: searchResult.name,
      imo: searchResult.imo,
      grossTonnage: searchResult.grossTonnage,
      yearBuilt: searchResult.yearBuilt,
      vesselType: searchResult.type,
      flag: searchResult.flag,
      lengthOverall: searchResult.lengthOverall,
      beam: searchResult.beam,
      draft: searchResult.draft,
      builder: searchResult.builder,
      currentLocation: searchResult.location,
      classificationSociety: searchResult.classSociety,
      classSocietyUrl: searchResult.classSocietyUrl,
      sanctionStatus: searchResult.isSanctioned ? 'Sanctioned' : 'Clean',
      sanctionDetails: searchResult.sanctionInfo,
      lastSurveyDate: searchResult.lastSurveyDate,
      certificateStatus: searchResult.certificateStatus,
      registrationDate: new Date().toISOString(),
      inspections: []
    };
    
    if (ships.some(s => s.imo === newShip.imo)) {
      alert('This ship is already registered in the database.');
      return;
    }

    setShips(prev => [...prev, newShip]);
    setActiveTab('list');
    setSelectedShip(newShip);
    setLookupName('');
    setLookupIMO('');
    setSearchResult(null);
  };

  const handleAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShip) return;

    const inspection: InspectionData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      inspectorName: newInspection.inspectorName || 'Unknown',
      location: newInspection.location || 'Unknown',
      deficienciesFound: newInspection.deficienciesFound || 0,
      detained: newInspection.detained || false,
      comments: newInspection.comments || ''
    };

    const updatedShips = ships.map(s => {
      if (s.id === selectedShip.id) {
        return { ...s, inspections: [...s.inspections, inspection] };
      }
      return s;
    });

    setShips(updatedShips);
    setSelectedShip(updatedShips.find(s => s.id === selectedShip.id) || null);
    setShowInspectionForm(false);
    setNewInspection({ inspectorName: '', location: '', deficienciesFound: 0, detained: false, comments: '' });
  };

  const handleAddSurveyor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurveyor.name || !newSurveyor.location) return;

    const surveyor: Surveyor = {
      id: Date.now().toString(),
      name: newSurveyor.name,
      location: newSurveyor.location,
      email: newSurveyor.email || '',
      phone: newSurveyor.phone || '',
      company: newSurveyor.company || ''
    };

    setSurveyors([...surveyors, surveyor]);
    setNewSurveyor({ name: '', location: '', email: '', phone: '', company: '' });
  };

  const handleDeleteShip = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the vessel ${name} from the registry? This action cannot be undone.`)) {
      setShips(prev => prev.filter(s => s.id !== id));
      if (selectedShip?.id === id) {
        setSelectedShip(null);
      }
    }
  };

  const handleDeleteSurveyor = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove surveyor ${name}?`)) {
      setSurveyors(prev => prev.filter(s => s.id !== id));
      if (selectedSurveyorForLetter?.id === id) {
        setSelectedSurveyorForLetter(null);
      }
    }
  };

  // Class Performance Functions
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;
    
    const newClass: ClassSocietyData = {
      id: Date.now().toString(),
      name: newClassName,
      pscData: [],
      trend: 'Steady',
      trendReason: 'Analysis Pending',
      lastUpdated: new Date().toISOString()
    };
    
    setClassSocieties([...classSocieties, newClass]);
    setNewClassName('');
    
    // Auto analyze
    await refreshClassData(newClass);
  };

  const deleteClass = (id: string) => {
    if(window.confirm('Delete this class society?')) {
      setClassSocieties(classSocieties.filter(c => c.id !== id));
    }
  };

  const refreshClassData = async (cls: ClassSocietyData) => {
    setIsClassAnalyzing(true);
    try {
      const result = await analyzeClassPerformance(cls.name);
      if (result) {
        setClassSocieties(prev => prev.map(p => p.id === cls.id ? { ...result, id: p.id } : p));
      }
    } catch (e) {
      alert(`Failed to update data for ${cls.name}`);
    } finally {
      setIsClassAnalyzing(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPass = localStorage.getItem('maj_app_password') || 'admin123';
    
    if (passwordData.current !== storedPass) {
      setPasswordMsg({ text: 'Current password is incorrect.', type: 'error' });
      return;
    }
    if (passwordData.new.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    localStorage.setItem('maj_app_password', passwordData.new);
    setPasswordMsg({ text: 'Password updated successfully.', type: 'success' });
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  // Derived Stats
  const totalGRT = ships.reduce((sum, ship) => sum + (ship.grossTonnage || 0), 0);
  const totalShips = ships.length;
  const sanctionedShips = ships.filter(s => s.sanctionStatus === 'Sanctioned').length;

  const flagData = ships.reduce((acc, ship) => {
    const flag = ship.flag || 'Unknown';
    acc[flag] = (acc[flag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(flagData).map(key => ({ name: key, count: flagData[key] }));

  // Helper to generate subject line
  const getLetterSubject = (prefix: string = '') => {
    let subject = "AUTHORIZATION TO CONDUCT FLAG STATE INSPECTION";
    if (letterShipId) {
       const s = ships.find(x => x.id === letterShipId);
       if (s) subject += ` - MV ${s.name} (IMO: ${s.imo})`;
    }
    return prefix + subject;
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-navy-900 text-white flex flex-col shadow-xl z-20 print:hidden">
        <div className="p-6 border-b border-navy-700">
          <div className="flex items-center space-x-3">
            <Anchor className="text-gold-500 w-8 h-8" />
            <div>
              <h2 className="font-bold text-lg leading-tight">MAJ Database</h2>
              <p className="text-xs text-navy-200">Official Registry</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('overview'); setSelectedShip(null); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'overview' ? 'bg-navy-800 text-gold-500 border-l-4 border-gold-500' : 'text-gray-300 hover:bg-navy-800'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('lookup'); setSelectedShip(null); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'lookup' ? 'bg-navy-800 text-gold-500 border-l-4 border-gold-500' : 'text-gray-300 hover:bg-navy-800'}`}
          >
            <PlusCircle size={20} />
            <span>Register Vessel</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('list'); setSelectedShip(null); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'list' ? 'bg-navy-800 text-gold-500 border-l-4 border-gold-500' : 'text-gray-300 hover:bg-navy-800'}`}
          >
            <Ship size={20} />
            <span>Vessel Fleet</span>
          </button>

          <button 
            onClick={() => { setActiveTab('surveyors'); setSelectedShip(null); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'surveyors' ? 'bg-navy-800 text-gold-500 border-l-4 border-gold-500' : 'text-gray-300 hover:bg-navy-800'}`}
          >
            <Users size={20} />
            <span>Surveyors (NES)</span>
          </button>

          <button 
            onClick={() => { setActiveTab('class_perf'); setSelectedShip(null); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'class_perf' ? 'bg-navy-800 text-gold-500 border-l-4 border-gold-500' : 'text-gray-300 hover:bg-navy-800'}`}
          >
            <Activity size={20} />
            <span>Class Performance</span>
          </button>

          <div className="pt-4 mt-4 border-t border-navy-700">
            <button 
              onClick={() => { setActiveTab('settings'); setSelectedShip(null); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${activeTab === 'settings' ? 'bg-navy-800 text-gold-500 border-l-4 border-gold-500' : 'text-gray-300 hover:bg-navy-800'}`}
            >
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-navy-700">
          <button onClick={onLogout} className="flex items-center space-x-2 text-gray-400 hover:text-white w-full px-4 py-2">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col relative print:overflow-visible print:h-auto">
        {/* Header */}
        <header className="bg-white shadow-md border-b border-gray-200 p-6 z-10 sticky top-0 print:hidden">
           <h1 className="text-2xl font-bold text-navy-900 uppercase tracking-wide">
             Maritime Authority of Jamaica <span className="text-gray-500 font-normal normal-case ml-2">| Large Ships Database</span>
           </h1>
        </header>

        <div className="p-8 print:p-0 flex-1">
          {/* Overview View */}
          {activeTab === 'overview' && !selectedShip && (
            <div className="space-y-6 print:hidden">
              <h2 className="text-xl font-semibold text-gray-700">Fleet Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Registered Vessels</p>
                      <h3 className="text-3xl font-bold text-navy-900 mt-2">{totalShips}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Ship className="text-blue-600" size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total GRT</p>
                      <h3 className="text-3xl font-bold text-navy-900 mt-2">{totalGRT.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <BarChart3 className="text-green-600" size={24} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Sanctions Flagged</p>
                      <h3 className="text-3xl font-bold text-red-600 mt-2">{sanctionedShips}</h3>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <AlertTriangle className="text-red-600" size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Fleet by Flag State</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]}>
                           {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1e3a8a' : '#2563eb'} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lookup View */}
          {activeTab === 'lookup' && (
            <div className="max-w-4xl mx-auto print:hidden">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-navy-900 mb-6">New Vessel Registration</h2>
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ship Name</label>
                    <input 
                      type="text" 
                      value={lookupName}
                      onChange={e => setLookupName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-800 outline-none"
                      placeholder="e.g. EVER GIVEN"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IMO Number</label>
                    <input 
                      type="text" 
                      value={lookupIMO}
                      onChange={e => setLookupIMO(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-800 outline-none"
                      placeholder="e.g. 9811000"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button 
                      type="submit" 
                      disabled={isSearching}
                      className="w-full bg-navy-900 text-white font-bold py-3 rounded-lg hover:bg-navy-800 transition flex justify-center items-center gap-2"
                    >
                      {isSearching ? 'Collecting Data from Web...' : <><Search size={20} /> Collect Vessel Data</>}
                    </button>
                  </div>
                </form>

                {searchError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                    <p className="text-red-700">{searchError}</p>
                  </div>
                )}

                {searchResult && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800">Data Collection Results</h3>
                      <span className="text-xs text-gray-500">Source: AI & Search Grounding</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500 font-semibold">Vessel Name</p>
                          <p className="font-medium text-lg">{searchResult.name}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500 font-semibold">IMO</p>
                          <p className="font-medium text-lg">{searchResult.imo}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500 font-semibold">Gross Tonnage</p>
                          <p className="font-medium">{searchResult.grossTonnage?.toLocaleString() || 'N/A'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500 font-semibold">Sanction Status</p>
                          <p className={`font-bold inline-block px-2 py-0.5 rounded text-sm ${searchResult.isSanctioned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {searchResult.isSanctioned ? 'WARNING: POSSIBLE SANCTION MATCH' : 'CLEAN'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{searchResult.sanctionInfo}</p>
                       </div>
                       
                       <div className="md:col-span-2 grid grid-cols-2 gap-x-8 gap-y-4 mt-2 p-3 bg-gray-50 rounded border border-gray-100">
                         <div className="space-y-1">
                            <p className="text-xs uppercase text-gray-500 font-semibold flex items-center gap-1"><Ruler size={12}/> LOA x Beam</p>
                            <p className="font-medium">{searchResult.lengthOverall || '?'} x {searchResult.beam || '?'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs uppercase text-gray-500 font-semibold flex items-center gap-1"><Hammer size={12}/> Builder</p>
                            <p className="font-medium">{searchResult.builder || 'Unknown'}</p>
                         </div>
                         {/* Survey Preview */}
                         <div className="space-y-1">
                            <p className="text-xs uppercase text-gray-500 font-semibold flex items-center gap-1"><CalendarCheck size={12}/> Last Survey</p>
                            <p className="font-medium">{searchResult.lastSurveyDate || 'Unknown'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs uppercase text-gray-500 font-semibold flex items-center gap-1"><ShieldCheck size={12}/> Cert Status</p>
                            <p className="font-medium">{searchResult.certificateStatus || 'Unknown'}</p>
                         </div>
                       </div>

                       <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500 font-semibold">Location (AIS)</p>
                          <div className="flex items-start gap-1">
                             <MapPin size={16} className="mt-1 text-blue-600" />
                             <p className="font-medium">{searchResult.location}</p>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500 font-semibold">Class Society</p>
                          <p className="font-medium">{searchResult.classSociety}</p>
                       </div>
                       <div className="md:col-span-2 pt-4">
                         <button 
                           onClick={registerShip}
                           className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition flex justify-center items-center gap-2"
                         >
                           <PlusCircle size={20} />
                           Confirm Registration & Add to Database
                         </button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List View */}
          {activeTab === 'list' && !selectedShip && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
               <div className="p-6 border-b border-gray-200">
                 <h2 className="text-xl font-bold text-navy-900">Registered Vessels</h2>
               </div>
               {ships.length === 0 ? (
                 <div className="p-12 text-center text-gray-500">
                   <Ship size={48} className="mx-auto mb-4 text-gray-300" />
                   <p>No ships registered yet.</p>
                 </div>
               ) : (
                 <table className="w-full text-left">
                   <thead className="bg-gray-50 text-gray-500 text-sm">
                     <tr>
                       <th className="px-6 py-4 font-medium">Name</th>
                       <th className="px-6 py-4 font-medium">IMO</th>
                       <th className="px-6 py-4 font-medium">Type</th>
                       <th className="px-6 py-4 font-medium">Flag</th>
                       <th className="px-6 py-4 font-medium">Status</th>
                       <th className="px-6 py-4 font-medium">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {ships.map(ship => (
                       <tr key={ship.id} className="hover:bg-gray-50 transition">
                         <td className="px-6 py-4 font-semibold text-navy-900">{ship.name}</td>
                         <td className="px-6 py-4 text-gray-600">{ship.imo}</td>
                         <td className="px-6 py-4 text-gray-600">{ship.vesselType}</td>
                         <td className="px-6 py-4 text-gray-600">{ship.flag}</td>
                         <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold ${ship.sanctionStatus === 'Sanctioned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                             {ship.sanctionStatus?.toUpperCase() || 'ACTIVE'}
                           </span>
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <button 
                               onClick={() => setSelectedShip(ship)}
                               className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                             >
                               View Details
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); handleDeleteShip(ship.id, ship.name); }}
                               className="text-red-500 hover:text-red-700 transition p-1 hover:bg-red-50 rounded"
                               title="Delete Vessel"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>
          )}

          {/* Surveyors View */}
          {activeTab === 'surveyors' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
              {/* Add Surveyor Form */}
              <div className="lg:col-span-1">
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                   <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                     <PlusCircle size={20} /> Add Non-Exclusive Surveyor
                   </h2>
                   <form onSubmit={handleAddSurveyor} className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Full Name</label>
                       <input required value={newSurveyor.name} onChange={e => setNewSurveyor({...newSurveyor, name: e.target.value})} className="w-full p-2 border rounded mt-1" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Location / Port</label>
                       <input required value={newSurveyor.location} onChange={e => setNewSurveyor({...newSurveyor, location: e.target.value})} className="w-full p-2 border rounded mt-1" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Company (Optional)</label>
                       <input value={newSurveyor.company} onChange={e => setNewSurveyor({...newSurveyor, company: e.target.value})} className="w-full p-2 border rounded mt-1" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Email</label>
                       <input type="email" value={newSurveyor.email} onChange={e => setNewSurveyor({...newSurveyor, email: e.target.value})} className="w-full p-2 border rounded mt-1" />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Phone</label>
                       <input value={newSurveyor.phone} onChange={e => setNewSurveyor({...newSurveyor, phone: e.target.value})} className="w-full p-2 border rounded mt-1" />
                     </div>
                     <button type="submit" className="w-full bg-navy-900 text-white font-bold py-2 rounded hover:bg-navy-800 transition">
                       Add Surveyor
                     </button>
                   </form>
                 </div>
              </div>

              {/* Surveyors List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                     <h2 className="text-xl font-bold text-navy-900">NES Directory</h2>
                  </div>
                  {surveyors.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic">No surveyors added yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {surveyors.map(surv => (
                        <div key={surv.id} className="p-6 hover:bg-gray-50 transition flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg text-navy-900">{surv.name}</h3>
                            <p className="text-gray-600 flex items-center gap-1 text-sm mt-1">
                              <MapPin size={14} /> {surv.location}
                              {surv.company && <span className="text-gray-400"> • {surv.company}</span>}
                            </p>
                            <div className="mt-2 text-sm text-gray-500 space-y-1">
                              <p>Email: {surv.email || 'N/A'}</p>
                              <p>Phone: {surv.phone || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <button 
                               onClick={() => { setSelectedSurveyorForLetter(surv); setLetterShipId(''); }}
                               className="bg-white border border-navy-900 text-navy-900 hover:bg-navy-50 px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
                             >
                               <FileText size={16} /> Generate Letter
                             </button>
                             <button
                               onClick={() => handleDeleteSurveyor(surv.id, surv.name)}
                               className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 mt-1 px-2 py-1 rounded hover:bg-red-50"
                             >
                               <Trash2 size={14} /> Delete
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Class Performance Tab */}
          {activeTab === 'class_perf' && (
            <div className="space-y-6 print:hidden">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-navy-900">Class Society Performance Monitor</h2>
                 <button 
                   onClick={() => setShowClassReport(true)}
                   className="bg-navy-900 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-navy-800 transition"
                 >
                   <Printer size={18} /> Print Report
                 </button>
              </div>

              {/* Add Class Form */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <form onSubmit={handleAddClass} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add New Classification Society</label>
                    <input 
                      required
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g. RINA, China Classification Society"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isClassAnalyzing}
                    className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 transition flex items-center gap-2 h-[42px]"
                  >
                    <PlusCircle size={18} /> Add
                  </button>
                </form>
              </div>

              {/* Class List Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Performance Status (Paris/Tokyo MoU & USCG)</h3>
                  <span className="text-xs text-gray-500">Data collected via AI search grounding</span>
                </div>
                <table className="w-full text-left">
                   <thead className="bg-gray-100 text-gray-600 text-sm">
                     <tr>
                       <th className="px-6 py-3">Class Society</th>
                       <th className="px-6 py-3">PSC Status Summary</th>
                       <th className="px-6 py-3">Trend</th>
                       <th className="px-6 py-3 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {classSocieties.map(cls => (
                       <tr key={cls.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4">
                           <p className="font-bold text-navy-900 text-lg">{cls.name}</p>
                           <p className="text-xs text-gray-500">Updated: {new Date(cls.lastUpdated).toLocaleDateString()}</p>
                         </td>
                         <td className="px-6 py-4">
                           {cls.pscData.length > 0 ? (
                             <div className="space-y-1">
                               {cls.pscData.map((d, idx) => (
                                 <div key={idx} className="flex items-center gap-2 text-sm">
                                   <span className="font-semibold w-24 text-gray-600">{d.mou}:</span>
                                   <span className={`px-2 py-0.5 rounded text-xs font-bold 
                                     ${d.listStatus.toLowerCase().includes('white') || d.listStatus.toLowerCase().includes('qualship') ? 'bg-green-100 text-green-800' : 
                                       d.listStatus.toLowerCase().includes('grey') ? 'bg-orange-100 text-orange-800' : 
                                       d.listStatus.toLowerCase().includes('black') || d.listStatus.toLowerCase().includes('targeted') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                     {d.listStatus}
                                   </span>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <span className="text-gray-400 italic text-sm">No data available</span>
                           )}
                         </td>
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                             {cls.trend === 'Up' && <TrendingUp className="text-green-600" />}
                             {cls.trend === 'Down' && <TrendingDown className="text-red-600" />}
                             {cls.trend === 'Steady' && <Minus className="text-gray-400" />}
                             <span className="font-medium">{cls.trend}</span>
                           </div>
                           <p className="text-xs text-gray-500 mt-1 max-w-xs">{cls.trendReason}</p>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => refreshClassData(cls)}
                               disabled={isClassAnalyzing}
                               className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                               title="Refresh Data from Web"
                             >
                               <RefreshCw size={18} className={isClassAnalyzing ? 'animate-spin' : ''} />
                             </button>
                             <button 
                               onClick={() => deleteClass(cls.id)}
                               className="p-2 text-red-600 hover:bg-red-50 rounded"
                               title="Delete Class"
                             >
                               <Trash2 size={18} />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto print:hidden">
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                 <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
                   <Settings size={24} /> Application Settings
                 </h2>
                 
                 <div className="border-t pt-6">
                   <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Access Password</h3>
                   <form onSubmit={handleChangePassword} className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700">Current Password</label>
                       <input 
                         type="password" 
                         required 
                         value={passwordData.current} 
                         onChange={e => setPasswordData({...passwordData, current: e.target.value})} 
                         className="w-full p-2 border rounded mt-1" 
                         autoComplete="off"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700">New Password</label>
                         <input 
                           type="password" 
                           required 
                           value={passwordData.new} 
                           onChange={e => setPasswordData({...passwordData, new: e.target.value})} 
                           className="w-full p-2 border rounded mt-1" 
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                         <input 
                           type="password" 
                           required 
                           value={passwordData.confirm} 
                           onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} 
                           className="w-full p-2 border rounded mt-1" 
                         />
                       </div>
                     </div>
                     
                     {passwordMsg.text && (
                       <div className={`p-3 rounded text-sm font-semibold ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                         {passwordMsg.text}
                       </div>
                     )}

                     <button type="submit" className="bg-navy-900 text-white font-bold py-2 px-6 rounded hover:bg-navy-800 transition">
                       Update Password
                     </button>
                   </form>
                 </div>
               </div>
            </div>
          )}

          {/* Ship Details View */}
          {selectedShip && (
            <div className="max-w-6xl mx-auto animate-fade-in print:hidden">
              <button 
                onClick={() => setSelectedShip(null)}
                className="mb-4 text-gray-500 hover:text-navy-900 flex items-center gap-1"
              >
                &larr; Back to List
              </button>
              
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                <div className="bg-navy-900 p-8 text-white flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      {selectedShip.name}
                      {selectedShip.sanctionStatus === 'Sanctioned' && <AlertTriangle className="text-red-500" />}
                    </h1>
                    <p className="text-navy-300 mt-1">IMO: {selectedShip.imo} • {selectedShip.flag}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-navy-300">Registration Date</p>
                    <p className="font-semibold">{new Date(selectedShip.registrationDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Details */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                         <p className="text-xs text-gray-500 uppercase font-bold">Vessel Type</p>
                         <p className="text-lg font-medium text-gray-800">{selectedShip.vesselType}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                         <p className="text-xs text-gray-500 uppercase font-bold">Gross Tonnage</p>
                         <p className="text-lg font-medium text-gray-800">{selectedShip.grossTonnage?.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                         <p className="text-xs text-gray-500 uppercase font-bold">Year Built</p>
                         <p className="text-lg font-medium text-gray-800">{selectedShip.yearBuilt}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                         <p className="text-xs text-gray-500 uppercase font-bold">Class Society</p>
                         {selectedShip.classSocietyUrl ? (
                           <a 
                             href={selectedShip.classSocietyUrl} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                             title="Open Class Society Certificate Page"
                           >
                             {selectedShip.classificationSociety}
                             <ExternalLink size={16} />
                           </a>
                         ) : selectedShip.classificationSociety ? (
                           <div className="flex flex-col">
                             <span className="text-lg font-medium text-gray-800">{selectedShip.classificationSociety}</span>
                             <div className="flex flex-wrap gap-2 mt-2">
                               <a 
                                 href={`https://www.google.com/search?q=${encodeURIComponent(selectedShip.classificationSociety + " vessel register " + selectedShip.name + " " + selectedShip.imo)}`}
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                               >
                                 <Search size={12} /> Search Register
                               </a>
                               <a 
                                 href="https://www.equasis.org/" 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
                                 title="Verify on Equasis"
                               >
                                 <ExternalLink size={12} /> Check Equasis
                               </a>
                             </div>
                           </div>
                         ) : (
                           <span className="text-lg font-medium text-gray-400">Unknown</span>
                         )}
                      </div>
                      
                      {/* Dimensions & Build Row */}
                      <div className="col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <p className="text-xs text-gray-500 uppercase font-bold">LOA</p>
                             <p className="font-medium">{selectedShip.lengthOverall || 'N/A'}</p>
                         </div>
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <p className="text-xs text-gray-500 uppercase font-bold">Beam</p>
                             <p className="font-medium">{selectedShip.beam || 'N/A'}</p>
                         </div>
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <p className="text-xs text-gray-500 uppercase font-bold">Draft</p>
                             <p className="font-medium">{selectedShip.draft || 'N/A'}</p>
                         </div>
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <p className="text-xs text-gray-500 uppercase font-bold">Builder</p>
                             <p className="font-medium truncate" title={selectedShip.builder}>{selectedShip.builder || 'N/A'}</p>
                         </div>
                      </div>

                      {/* Surveys & Certs */}
                      <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                           <p className="text-xs text-blue-600 uppercase font-bold flex items-center gap-1"><CalendarCheck size={12}/> Last Special Survey</p>
                           <p className="text-lg font-medium text-blue-900">{selectedShip.lastSurveyDate || 'Not Available'}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                           <p className="text-xs text-blue-600 uppercase font-bold flex items-center gap-1"><ShieldCheck size={12}/> Certificate Status</p>
                           <p className="text-lg font-medium text-blue-900">{selectedShip.certificateStatus || 'Not Available'}</p>
                        </div>
                      </div>

                      <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                         <p className="text-xs text-gray-600 uppercase font-bold flex items-center gap-1"><MapPin size={12}/> Last Known AIS Location</p>
                         <p className="text-lg font-medium text-gray-900">{selectedShip.currentLocation}</p>
                      </div>

                      {selectedShip.sanctionStatus === 'Sanctioned' && (
                        <div className="col-span-2 bg-red-50 p-4 rounded-lg border border-red-100">
                           <p className="text-xs text-red-600 uppercase font-bold flex items-center gap-1"><AlertTriangle size={12}/> Sanction Warning</p>
                           <p className="text-sm text-red-900 mt-1">{selectedShip.sanctionDetails}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-8">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                           <FileText size={20} /> Flag State Inspections
                         </h3>
                         <button 
                           onClick={() => setShowInspectionForm(!showInspectionForm)}
                           className="bg-navy-900 text-white px-4 py-2 rounded hover:bg-navy-800 transition text-sm font-medium"
                         >
                           {showInspectionForm ? 'Cancel Entry' : 'Add New Report'}
                         </button>
                       </div>

                       {showInspectionForm && (
                         <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 animate-fade-in">
                           <form onSubmit={handleAddInspection} className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                 <label className="block text-sm font-medium text-gray-700">Inspector Name</label>
                                 <input required className="w-full p-2 border rounded" value={newInspection.inspectorName} onChange={e => setNewInspection({...newInspection, inspectorName: e.target.value})} />
                               </div>
                               <div>
                                 <label className="block text-sm font-medium text-gray-700">Location</label>
                                 <input required className="w-full p-2 border rounded" value={newInspection.location} onChange={e => setNewInspection({...newInspection, location: e.target.value})} />
                               </div>
                               <div>
                                 <label className="block text-sm font-medium text-gray-700">Deficiencies</label>
                                 <input type="number" className="w-full p-2 border rounded" value={newInspection.deficienciesFound} onChange={e => setNewInspection({...newInspection, deficienciesFound: parseInt(e.target.value)})} />
                               </div>
                               <div className="flex items-center">
                                 <label className="flex items-center gap-2 text-sm font-medium text-red-600 cursor-pointer">
                                   <input type="checkbox" className="w-4 h-4" checked={newInspection.detained} onChange={e => setNewInspection({...newInspection, detained: e.target.checked})} />
                                   Ship Detained?
                                 </label>
                               </div>
                             </div>
                             <div>
                               <label className="block text-sm font-medium text-gray-700">Comments</label>
                               <textarea className="w-full p-2 border rounded h-24" value={newInspection.comments} onChange={e => setNewInspection({...newInspection, comments: e.target.value})} />
                             </div>
                             <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700">Submit Report</button>
                           </form>
                         </div>
                       )}

                       {selectedShip.inspections.length === 0 ? (
                         <p className="text-gray-500 italic">No inspections recorded yet.</p>
                       ) : (
                         <div className="space-y-4">
                           {selectedShip.inspections.map(insp => (
                             <div key={insp.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                               <div className="flex justify-between mb-2">
                                 <p className="font-bold text-navy-900">{new Date(insp.date).toLocaleDateString()} - {insp.location}</p>
                                 {insp.detained && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold uppercase">Detained</span>}
                               </div>
                               <p className="text-sm text-gray-600 mb-2">Inspector: {insp.inspectorName} | Deficiencies: {insp.deficienciesFound}</p>
                               <p className="text-gray-700 bg-gray-50 p-3 rounded text-sm">{insp.comments}</p>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                  
                  {/* Right Column: Quick Status */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                       <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Compliance Status</h3>
                       <ul className="space-y-3">
                         <li className="flex justify-between items-center text-sm">
                           <span className="text-gray-600">Registration</span>
                           <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={14}/> Active</span>
                         </li>
                         <li className="flex justify-between items-center text-sm">
                           <span className="text-gray-600">Sanctions</span>
                           <span className={`font-bold flex items-center gap-1 ${selectedShip.sanctionStatus === 'Sanctioned' ? 'text-red-600' : 'text-green-600'}`}>
                             {selectedShip.sanctionStatus === 'Sanctioned' ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>}
                             {selectedShip.sanctionStatus || 'Clean'}
                           </span>
                         </li>
                         <li className="flex justify-between items-center text-sm">
                           <span className="text-gray-600">Total Inspections</span>
                           <span className="font-bold text-navy-900">{selectedShip.inspections.length}</span>
                         </li>
                       </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Letter Modal (Surveyor) */}
          {selectedSurveyorForLetter && (
             <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                   <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0">
                      <h2 className="font-bold text-lg text-gray-800">Authorization Letter Preview</h2>
                      <div className="flex gap-2">
                        <a 
                          href={`mailto:${selectedSurveyorForLetter.email || ''}?subject=${encodeURIComponent(getLetterSubject('RE: '))}`}
                          className={`flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 ${!selectedSurveyorForLetter.email ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                          title={selectedSurveyorForLetter.email ? `Send to ${selectedSurveyorForLetter.email}` : 'No email address available'}
                        >
                          <Send size={16}/> Send Email
                        </a>
                        <button 
                          onClick={() => window.print()} 
                          className="flex items-center gap-2 bg-navy-900 text-white px-4 py-2 rounded text-sm hover:bg-navy-800"
                        >
                          <Printer size={16}/> Print Letter
                        </button>
                        <button 
                          onClick={() => setSelectedSurveyorForLetter(null)} 
                          className="p-2 text-gray-500 hover:text-gray-800"
                        >
                          <X size={24}/>
                        </button>
                      </div>
                   </div>
                   
                   <div className="p-6 bg-gray-50 border-b">
                     <label className="block text-sm font-bold text-gray-700 mb-2">Select Target Vessel (Optional):</label>
                     <select 
                       className="w-full p-2 border rounded"
                       value={letterShipId}
                       onChange={(e) => setLetterShipId(e.target.value)}
                     >
                       <option value="">-- General Authorization / No Vessel Selected --</option>
                       {ships.map(s => (
                         <option key={s.id} value={s.id}>{s.name} (IMO: {s.imo})</option>
                       ))}
                     </select>
                   </div>

                   <div id="print-area" className="p-12 font-serif text-black leading-relaxed">
                      {/* Letter Header */}
                      <div className="text-center mb-12">
                         <h1 className="text-3xl font-bold uppercase text-navy-900 mb-2">Maritime Authority of Jamaica</h1>
                         <div className="h-1 w-32 bg-gold-500 mx-auto mb-2"></div>
                         <p className="text-sm font-semibold uppercase tracking-widest">Directorate of Survey, Environment and Certification (DSEC)</p>
                         <p className="text-sm text-gray-600">12 Ocean Boulevard, Kingston, Jamaica</p>
                      </div>

                      {/* Date & Addressee */}
                      <div className="mb-8">
                         <p className="mb-6">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                         <p className="font-bold uppercase">{selectedSurveyorForLetter.name}</p>
                         {selectedSurveyorForLetter.company && <p>{selectedSurveyorForLetter.company}</p>}
                         <p>{selectedSurveyorForLetter.location}</p>
                      </div>

                      {/* Subject */}
                      <div className="mb-8">
                        <p className="font-bold underline uppercase">
                          {getLetterSubject('RE: ')}
                        </p>
                      </div>

                      {/* Body */}
                      <div className="space-y-4 text-justify">
                        <p>Dear Sir/Madam,</p>
                        <p>
                          This letter serves to formally authorize <strong>{selectedSurveyorForLetter.name}</strong>, a Non-Exclusive Surveyor appointed by the Maritime Authority of Jamaica, to carry out a Flag State Inspection {letterShipId ? 'on board the above-captioned vessel' : 'on behalf of the Administration'}.
                        </p>
                        <p>
                          The inspection should be conducted in accordance with the Maritime Authority of Jamaica's established guidelines and the applicable international maritime conventions. Upon completion of the survey, please forward the signed report along with any list of deficiencies and rectification evidence directly to our head office.
                        </p>
                        <p>
                          This authorization is valid for the specific inspection requested and expires upon the submission of the final report, unless otherwise stated.
                        </p>
                        <p>
                          We appreciate your cooperation and service to the Jamaican flag.
                        </p>
                      </div>

                      {/* Footer / Sign-off */}
                      <div className="mt-16">
                        <p>Sincerely,</p>
                        <div className="h-16 mt-4">
                          {/* Placeholder for signature */}
                        </div>
                        <p className="font-bold border-t border-black w-64 pt-2">Surveyor General</p>
                        <p className="text-sm">Maritime Authority of Jamaica</p>
                      </div>
                   </div>
                   
                   {/* Print Styles */}
                   <style>{`
                     @media print {
                       /* Reset all layout constraints for printing */
                       html, body, #root, main {
                         overflow: visible !important;
                         height: auto !important;
                       }
                       
                       /* Hide everything by default */
                       body * {
                         visibility: hidden;
                       }

                       /* Show only the print area and its children */
                       #print-area, #print-area * {
                         visibility: visible;
                       }

                       /* Position the print area at the very top */
                       #print-area {
                         position: absolute;
                         left: 0;
                         top: 0;
                         width: 100%;
                         margin: 0;
                         padding: 0;
                         background-color: white;
                         z-index: 9999;
                       }
                     }
                   `}</style>
                </div>
             </div>
          )}

          {/* Class Performance Report Modal (Printable) */}
          {showClassReport && (
             <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                   <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0">
                      <h2 className="font-bold text-lg text-gray-800">Class Performance Report</h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.print()} 
                          className="flex items-center gap-2 bg-navy-900 text-white px-4 py-2 rounded text-sm hover:bg-navy-800"
                        >
                          <Printer size={16}/> Print Report
                        </button>
                        <button 
                          onClick={() => setShowClassReport(false)} 
                          className="p-2 text-gray-500 hover:text-gray-800"
                        >
                          <X size={24}/>
                        </button>
                      </div>
                   </div>

                   <div id="print-area-class" className="p-12 font-sans text-black leading-relaxed">
                      <div className="text-center mb-8 border-b-2 border-navy-900 pb-4">
                         <h1 className="text-3xl font-bold uppercase text-navy-900">Maritime Authority of Jamaica</h1>
                         <h2 className="text-xl text-gray-600 mt-2">Recognized Organizations (RO) Performance Monitor</h2>
                         <p className="text-sm text-gray-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
                      </div>

                      <div className="mb-8">
                         <h3 className="font-bold text-lg mb-4 text-navy-900 uppercase">Port State Control Performance Summary</h3>
                         <table className="w-full border-collapse border border-gray-300">
                           <thead>
                             <tr className="bg-gray-100">
                               <th className="border border-gray-300 p-2 text-left">Class Society</th>
                               <th className="border border-gray-300 p-2 text-left">Paris MoU</th>
                               <th className="border border-gray-300 p-2 text-left">Tokyo MoU</th>
                               <th className="border border-gray-300 p-2 text-left">USCG</th>
                               <th className="border border-gray-300 p-2 text-center">Trend</th>
                             </tr>
                           </thead>
                           <tbody>
                             {classSocieties.map(cls => {
                               const paris = cls.pscData.find(d => d.mou.includes('Paris'))?.listStatus || 'N/A';
                               const tokyo = cls.pscData.find(d => d.mou.includes('Tokyo'))?.listStatus || 'N/A';
                               const uscg = cls.pscData.find(d => d.mou.includes('USCG'))?.listStatus || 'N/A';
                               return (
                                 <tr key={cls.id}>
                                   <td className="border border-gray-300 p-2 font-bold">{cls.name}</td>
                                   <td className="border border-gray-300 p-2">{paris}</td>
                                   <td className="border border-gray-300 p-2">{tokyo}</td>
                                   <td className="border border-gray-300 p-2">{uscg}</td>
                                   <td className="border border-gray-300 p-2 text-center">{cls.trend}</td>
                                 </tr>
                               );
                             })}
                           </tbody>
                         </table>
                      </div>

                      <div className="mt-8">
                         <h3 className="font-bold text-lg mb-2 text-navy-900 uppercase">Analysis Notes</h3>
                         <ul className="list-disc pl-5 space-y-2">
                           {classSocieties.map(cls => (
                             <li key={cls.id} className="text-sm">
                               <strong>{cls.name}:</strong> {cls.trendReason || 'No recent analysis data available.'}
                             </li>
                           ))}
                         </ul>
                      </div>
                   </div>
                   
                   {/* Print Styles for Class Report */}
                   <style>{`
                     @media print {
                       html, body, #root, main {
                         overflow: visible !important;
                         height: auto !important;
                       }
                       body * {
                         visibility: hidden;
                       }
                       #print-area-class, #print-area-class * {
                         visibility: visible;
                       }
                       #print-area-class {
                         position: absolute;
                         left: 0;
                         top: 0;
                         width: 100%;
                         margin: 0;
                         padding: 0;
                         background-color: white;
                         z-index: 9999;
                       }
                     }
                   `}</style>
                </div>
             </div>
          )}
        </div>
        
        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 py-6 text-center print:hidden z-10">
           <div className="flex flex-col items-center justify-center space-y-2">
             <div className="bg-navy-900 p-2 rounded-full border-2 border-gold-500">
                <Anchor className="w-6 h-6 text-white" />
             </div>
             <p className="text-sm text-gray-500 font-medium">
               &copy; {new Date().getFullYear()} Maritime Authority of Jamaica. All Rights Reserved.
             </p>
           </div>
        </footer>
      </main>
    </div>
  );
};