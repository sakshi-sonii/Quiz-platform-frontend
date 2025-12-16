import React, { useState, useEffect } from 'react';
import { BookOpen, Users, FileText, Clock, Award, LogOut } from 'lucide-react';

interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  name: string;
  approved: boolean;
  course?: string;
}

interface Question {
  question: string;
  options: string[];
  correct: number;
}

interface Test {
  id: string;
  title: string;
  course: string;
  subject: string;
  duration: number;
  questions: Question[];
  teacherId: string;
  approved: boolean;
  active: boolean;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
}

interface Material {
  id: string;
  title: string;
  course: string;
  subject: string;
  content: string;
  type: 'notes' | 'video' | 'pdf';
  teacherId: string;
  createdAt: string;
}

interface Attempt {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  total: number;
  answers: Record<number, number>;
  submittedAt: string;
}

const QuizPlatform: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [view, setView] = useState<string>('login');
  const [currentTest, setCurrentTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, testsData, coursesData, materialsData, attemptsData] = await Promise.all([
          window.storage.get('users').catch(() => null),
          window.storage.get('tests').catch(() => null),
          window.storage.get('courses').catch(() => null),
          window.storage.get('materials').catch(() => null),
          window.storage.get('attempts').catch(() => null)
        ]);

        setUsers(usersData ? JSON.parse(usersData.value!) : [{
          id: '1', email: 'admin@quiz.com', password: 'admin123', role: 'admin' as const, name: 'Admin User', approved: true
        }]);
        setTests(testsData ? JSON.parse(testsData.value!) : []);
        setCourses(coursesData ? JSON.parse(coursesData.value!) : []);
        setMaterials(materialsData ? JSON.parse(materialsData.value!) : []);
        setAttempts(attemptsData ? JSON.parse(attemptsData.value!) : []);
      } catch (err) {
        console.error('Load error:', err);
      }
    };
    loadData();
  }, []);

  // Save data to storage
  const saveData = async () => {
    try {
      await Promise.all([
        window.storage.set('users', JSON.stringify(users)),
        window.storage.set('tests', JSON.stringify(tests)),
        window.storage.set('courses', JSON.stringify(courses)),
        window.storage.set('materials', JSON.stringify(materials)),
        window.storage.set('attempts', JSON.stringify(attempts))
      ]);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  useEffect(() => {
    if (users.length > 0 || tests.length > 0 || courses.length > 0 || materials.length > 0 || attempts.length > 0) {
      saveData();
    }
  }, [users, tests, courses, materials, attempts]);

  // Timer for test
  useEffect(() => {
    if (currentTest && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            submitTest();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentTest, timeLeft]);

  const login = (email: string, password: string) => {
    const u = users.find(user => user.email === email && user.password === password);
    if (u && u.approved) {
      setUser(u);
      setView(u.role === 'admin' ? 'admin' : u.role === 'teacher' ? 'teacher' : 'student');
    } else if (u && !u.approved) {
      alert('Account pending approval');
    } else {
      alert('Invalid credentials');
    }
  };

  const register = (email: string, password: string, name: string, role: 'student' | 'teacher', course: string = '') => {
    if (users.find(u => u.email === email)) {
      alert('Email already exists');
      return;
    }
    const newUser: User = {
      id: Date.now().toString(),
      email, password, name, role,
      approved: role === 'student',
      course: role === 'student' ? course : ''
    };
    setUsers([...users, newUser]);
    alert(role === 'student' ? 'Registration successful! You can now login.' : 'Registration successful! Awaiting admin approval.');
  };

  const logout = () => {
    setUser(null);
    setView('login');
    setCurrentTest(null);
    setAnswers({});
  };

  const addCourse = (name: string, description: string) => {
    setCourses([...courses, { id: Date.now().toString(), name, description }]);
  };

  const addTest = (title: string, course: string, subject: string, duration: number, questions: Question[]) => {
    const newTest: Test = {
      id: Date.now().toString(),
      title, course, subject, duration,
      questions,
      teacherId: user!.id,
      approved: false,
      active: false,
      createdAt: new Date().toISOString()
    };
    setTests([...tests, newTest]);
  };

  const addMaterial = (title: string, course: string, subject: string, content: string, type: 'notes' | 'video' | 'pdf') => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      title, course, subject, content, type,
      teacherId: user!.id,
      createdAt: new Date().toISOString()
    };
    setMaterials([...materials, newMaterial]);
  };

  const startTest = (test: Test) => {
    setCurrentTest(test);
    setAnswers({});
    setTimeLeft(test.duration * 60);
    setView('taking-test');
  };

  const submitTest = () => {
    if (!currentTest) return;
    
    let score = 0;
    currentTest.questions.forEach((q, idx) => {
      if (answers[idx] === q.correct) score++;
    });

    const attempt: Attempt = {
      id: Date.now().toString(),
      testId: currentTest.id,
      studentId: user!.id,
      score,
      total: currentTest.questions.length,
      answers,
      submittedAt: new Date().toISOString()
    };
    setAttempts([...attempts, attempt]);
    alert(`Test submitted! Score: ${score}/${currentTest.questions.length}`);
    setCurrentTest(null);
    setAnswers({});
    setView('student');
  };

  const LoginView: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ 
      email: '', 
      password: '', 
      name: '', 
      role: 'student' as 'student' | 'teacher', 
      course: '' 
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Award className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Quiz Platform</h1>
            <p className="text-gray-600 mt-2">CET/JEE Test Preparation</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setIsLogin(true)} 
              className={`flex-1 py-2 rounded-lg font-medium ${isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)} 
              className={`flex-1 py-2 rounded-lg font-medium ${!isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <input 
                type="text" 
                placeholder="Full Name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full px-4 py-3 border rounded-lg" 
              />
            )}
            
            <input 
              type="email" 
              placeholder="Email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full px-4 py-3 border rounded-lg" 
            />
            
            <input 
              type="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              className="w-full px-4 py-3 border rounded-lg" 
            />
            
            {!isLogin && (
              <>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value as 'student' | 'teacher'})} 
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
                
                {formData.role === 'student' && (
                  <select 
                    value={formData.course} 
                    onChange={e => setFormData({...formData, course: e.target.value})} 
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </>
            )}

            <button 
              onClick={() => isLogin 
                ? login(formData.email, formData.password) 
                : register(formData.email, formData.password, formData.name, formData.role, formData.course)
              } 
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700"
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-6 text-center">Demo: admin@quiz.com / admin123</p>
        </div>
      </div>
    );
  };

  const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [courseForm, setCourseForm] = useState({ name: '', description: '' });

    const pendingUsers = users.filter(u => !u.approved && u.role === 'teacher');
    const pendingTests = tests.filter(t => !t.approved);

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Award className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold">Admin Panel</span>
            </div>
            <button 
              onClick={logout} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 overflow-x-auto">
            {['users', 'tests', 'courses', 'analytics'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Pending Approvals ({pendingUsers.length})</h2>
                {pendingUsers.length === 0 ? (
                  <p className="text-gray-500">No pending approvals</p>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map(u => (
                      <div key={u.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-gray-600">{u.email} - {u.role}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setUsers(users.map(usr => usr.id === u.id ? {...usr, approved: true} : usr))} 
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => setUsers(users.filter(usr => usr.id !== u.id))} 
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">All Users ({users.length})</h2>
                <div className="space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-gray-600">{u.email} - {u.role}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm ${u.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {u.approved ? 'Active' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Pending Test Approvals ({pendingTests.length})</h2>
              {pendingTests.length === 0 ? (
                <p className="text-gray-500">No pending tests</p>
              ) : (
                <div className="space-y-3">
                  {pendingTests.map(t => {
                    const teacher = users.find(u => u.id === t.teacherId);
                    return (
                      <div key={t.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg">{t.title}</p>
                            <p className="text-sm text-gray-600">By: {teacher?.name} | Subject: {t.subject} | Duration: {t.duration} min</p>
                            <p className="text-sm text-gray-500 mt-1">{t.questions.length} questions</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setTests(tests.map(test => test.id === t.id ? {...test, approved: true} : test))} 
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => setTests(tests.filter(test => test.id !== t.id))} 
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Manage Courses</h2>
              <div className="mb-6 space-y-3">
                <input 
                  type="text" 
                  placeholder="Course Name" 
                  value={courseForm.name} 
                  onChange={e => setCourseForm({...courseForm, name: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
                <textarea 
                  placeholder="Description" 
                  value={courseForm.description} 
                  onChange={e => setCourseForm({...courseForm, description: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg" 
                  rows={3} 
                />
                <button 
                  onClick={() => { 
                    if(courseForm.name) { 
                      addCourse(courseForm.name, courseForm.description); 
                      setCourseForm({name: '', description: ''}); 
                    } 
                  }} 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Course
                </button>
              </div>
              <div className="space-y-2">
                {courses.map(c => (
                  <div key={c.id} className="p-4 border rounded-lg">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-sm text-gray-600">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <Users className="w-12 h-12 text-indigo-600 mb-3" />
                <p className="text-3xl font-bold">{users.length}</p>
                <p className="text-gray-600">Total Users</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <FileText className="w-12 h-12 text-green-600 mb-3" />
                <p className="text-3xl font-bold">{tests.length}</p>
                <p className="text-gray-600">Total Tests</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <BookOpen className="w-12 h-12 text-blue-600 mb-3" />
                <p className="text-3xl font-bold">{attempts.length}</p>
                <p className="text-gray-600">Test Attempts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TeacherView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('tests');
    const [testForm, setTestForm] = useState({ 
      title: '', 
      course: '', 
      subject: '', 
      duration: 60, 
      questions: [] as Question[] 
    });
    const [questionForm, setQuestionForm] = useState({ 
      question: '', 
      options: ['', '', '', ''], 
      correct: 0 
    });
    const [materialForm, setMaterialForm] = useState({ 
      title: '', 
      course: '', 
      subject: '', 
      content: '', 
      type: 'notes' as 'notes' | 'video' | 'pdf'
    });

    const myTests = tests.filter(t => t.teacherId === user!.id);

    const addQuestion = () => {
  if (questionForm.question && questionForm.options.every(o => o)) {
    setTestForm(prev => ({
      ...prev,
      questions: [...prev.questions, questionForm]
    }));
    setQuestionForm({ question: '', options: ['', '', '', ''], correct: 0 });
  }
};
const flushPendingQuestion = () => {
  if (
    questionForm.question &&
    questionForm.options.every(o => o)
  ) {
    setTestForm(prev => ({
      ...prev,
      questions: [...prev.questions, questionForm],
    }));
    setQuestionForm({ question: '', options: ['', '', '', ''], correct: 0 });
    return true;
  }
  return false;
};


    const createTest = () => {
  // Force-add last pending question
  flushPendingQuestion();

  setTimeout(() => {
    setTestForm(prev => {
      if (
        prev.title &&
        prev.course &&
        prev.subject &&
        prev.questions.length > 0
      ) {
        addTest(
          prev.title,
          prev.course,
          prev.subject,
          prev.duration,
          prev.questions
        );

        alert('Test created! Awaiting admin approval.');

        return {
          title: '',
          course: '',
          subject: '',
          duration: 60,
          questions: [],
        };
      } else {
        alert('Please fill all fields and add at least one question');
        return prev;
      }
    });

    setActiveTab('tests');
  }, 0);
};


    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold">Teacher Dashboard</span>
            </div>
            <button 
              onClick={logout} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 overflow-x-auto">
            {['tests', 'create-test', 'materials'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>

          {activeTab === 'tests' && (
            <div className="space-y-4">
              {myTests.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tests created yet</p>
                </div>
              ) : (
                myTests.map(t => (
                  <div key={t.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold">{t.title}</h3>
                        <p className="text-gray-600">{t.subject} | {t.duration} minutes | {t.questions.length} questions</p>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-3 py-1 rounded text-sm ${t.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {t.approved ? 'Approved' : 'Pending Approval'}
                          </span>
                          {t.approved && (
                            <span className={`px-3 py-1 rounded text-sm ${t.active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                              {t.active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </div>
                      </div>
                      {t.approved && (
                        <button 
                          onClick={() => setTests(tests.map(test => test.id === t.id ? {...test, active: !test.active} : test))} 
                          className={`px-4 py-2 rounded-lg ${t.active ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                          {t.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'create-test' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Create New Test</h2>
              <div className="space-y-4 mb-6">
                <input 
                  type="text" 
                  placeholder="Test Title" 
                  value={testForm.title} 
                  onChange={e => setTestForm({...testForm, title: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select 
                    value={testForm.course} 
                    onChange={e => setTestForm({...testForm, course: e.target.value})} 
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  
                  <input 
                    type="text" 
                    placeholder="Subject (e.g., Physics)" 
                    value={testForm.subject} 
                    onChange={e => setTestForm({...testForm, subject: e.target.value})} 
                    className="px-4 py-2 border rounded-lg" 
                  />
                  
                  <input 
                    type="number" 
                    placeholder="Duration (minutes)" 
                    value={testForm.duration} 
                    onChange={e => setTestForm({...testForm, duration: parseInt(e.target.value)})} 
                    className="px-4 py-2 border rounded-lg" 
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-bold mb-3">Add Question ({testForm.questions.length} added)</h3>
                  <textarea 
                    placeholder="Question" 
                    value={questionForm.question} 
                    onChange={e => setQuestionForm({...questionForm, question: e.target.value})} 
                    className="w-full px-4 py-2 border rounded-lg mb-3" 
                    rows={2} 
                  />
                  
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        placeholder={`Option ${idx + 1}`} 
                        value={opt} 
                        onChange={e => {
                          const newOpts = [...questionForm.options];
                          newOpts[idx] = e.target.value;
                          setQuestionForm({...questionForm, options: newOpts});
                        }} 
                        className="flex-1 px-4 py-2 border rounded-lg" 
                      />
                      <button 
                        onClick={() => setQuestionForm({...questionForm, correct: idx})} 
                        className={`px-4 py-2 rounded-lg ${questionForm.correct === idx ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                      >
                        {questionForm.correct === idx ? '✓' : 'Set Correct'}
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addQuestion} 
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Question
                  </button>
                </div>

                {testForm.questions.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">Questions Preview</h3>
                    {testForm.questions.map((q, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded mb-2">
                        <p className="font-medium">Q{idx + 1}: {q.question}</p>
                        <p className="text-sm text-green-600">Correct: {q.options[q.correct]}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={createTest} 
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  Submit Test for Approval
                </button>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-6">Upload Study Material</h2>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Material Title" 
                  value={materialForm.title} 
                  onChange={e => setMaterialForm({...materialForm, title: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg" 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select 
                    value={materialForm.course} 
                    onChange={e => setMaterialForm({...materialForm, course: e.target.value})} 
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  
                  <input 
                    type="text" 
                    placeholder="Subject" 
                    value={materialForm.subject} 
                    onChange={e => setMaterialForm({...materialForm, subject: e.target.value})} 
                    className="px-4 py-2 border rounded-lg" 
                  />
                  
                  <select 
                    value={materialForm.type} 
                    onChange={e => setMaterialForm({...materialForm, type: e.target.value as 'notes' | 'video' | 'pdf'})} 
                    className="px-4 py-2 border rounded-lg"
                  >
                    <option value="notes">Notes</option>
                    <option value="video">Video Link</option>
                    <option value="pdf">PDF Link</option>
                  </select>
                </div>

                <textarea 
                  placeholder="Content (Notes or URL)" 
                  value={materialForm.content} 
                  onChange={e => setMaterialForm({...materialForm, content: e.target.value})} 
                  className="w-full px-4 py-2 border rounded-lg" 
                  rows={5} 
                />
                
                <button 
                  onClick={() => { 
                    if(materialForm.title && materialForm.content) { 
                      addMaterial(materialForm.title, materialForm.course, materialForm.subject, materialForm.content, materialForm.type); 
                      setMaterialForm({ title: '', course: '', subject: '', content: '', type: 'notes' }); 
                    } 
                  }} 
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Upload Material
                </button>
              </div>

              <div className="mt-8">
                <h3 className="font-bold mb-4">My Materials</h3>
                <div className="space-y-2">
                  {materials.filter(m => m.teacherId === user!.id).map(m => (
                    <div key={m.id} className="p-4 border rounded-lg">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-sm text-gray-600">{m.subject} | {m.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StudentView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('tests');
    
    const studentCourse = courses.find(c => c.id === user!.course);
    const availableTests = tests.filter(t => t.approved && t.active && t.course === user!.course);
    const myAttempts = attempts.filter(a => a.studentId === user!.id);
    const availableMaterials = materials.filter(m => m.course === user!.course);

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-8 h-8 text-indigo-600" />
                <span className="text-xl font-bold">Student Portal</span>
              </div>
              <p className="text-sm text-gray-600">{studentCourse?.name || 'No course assigned'}</p>
            </div>
            <button 
              onClick={logout} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />Logout
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 overflow-x-auto">
            {['tests', 'results', 'materials'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'tests' && (
            <div className="space-y-4">
              {availableTests.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active tests available</p>
                </div>
              ) : (
                availableTests.map(t => (
                  <div key={t.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold">{t.title}</h3>
                        <p className="text-gray-600">{t.subject}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />{t.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />{t.questions.length} questions
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => startTest(t)} 
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                      >
                        Start Test
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-4">
              {myAttempts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No test attempts yet</p>
                </div>
              ) : (
                myAttempts.map(a => {
                  const test = tests.find(t => t.id === a.testId);
                  const percentage = ((a.score / a.total) * 100).toFixed(1);
                  return (
                    <div key={a.id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold">{test?.title}</h3>
                          <p className="text-gray-600">{test?.subject}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(a.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-indigo-600">{percentage}%</p>
                          <p className="text-gray-600">{a.score}/{a.total} correct</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              {availableMaterials.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No study materials available</p>
                </div>
              ) : (
                availableMaterials.map(m => (
                  <div key={m.id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold mb-2">{m.title}</h3>
                    <p className="text-gray-600 mb-2">{m.subject} | {m.type}</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {m.type === 'notes' ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <a 
                          href={m.content} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-indigo-600 hover:underline"
                        >
                          Open {m.type}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const TakingTestView: React.FC = () => {
    const formatTime = (seconds: number): string => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!currentTest) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b sticky top-0">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{currentTest.title}</h2>
              <p className="text-sm text-gray-600">{currentTest.subject}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                <Clock className="w-5 h-5" />
                <span className="font-bold">{formatTime(timeLeft)}</span>
              </div>
              <button 
                onClick={submitTest} 
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Submit
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {currentTest.questions.map((q, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-6">
                <p className="font-bold text-lg mb-4">Q{idx + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <label 
                      key={optIdx} 
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        answers[idx] === optIdx 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name={`q${idx}`} 
                        checked={answers[idx] === optIdx} 
                        onChange={() => setAnswers({...answers, [idx]: optIdx})} 
                        className="mr-3" 
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-center">
            <p className="text-gray-600">
              Answered: {Object.keys(answers).length}/{currentTest.questions.length}
            </p>
            <button 
              onClick={submitTest} 
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {!user && <LoginView />}
      {user && view === 'admin' && <AdminView />}
      {user && view === 'teacher' && <TeacherView />}
      {user && view === 'student' && <StudentView />}
      {user && view === 'taking-test' && <TakingTestView />}
    </>
  );
};

export default QuizPlatform;