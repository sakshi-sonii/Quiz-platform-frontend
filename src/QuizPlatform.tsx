import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Users, FileText, Clock, Award, LogOut } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || "";

const api = async (url: string, method: string = "GET", body?: any) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/api/${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return data.map(d => ({ ...d, id: d._id || d.id }));
  }

  if (data?._id) {
    data.id = data._id;
  }

  return data;
};

interface User {
  id: string;
  email: string;
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
  const [loading, setLoading] = useState(false);

  // Fetch courses on mount (needed for registration)
  useEffect(() => {
    api("courses").then(setCourses).catch(console.error);
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    api("auth/me", "GET")
      .then(res => {
        if (res?.user) {
          const userData = { ...res.user, id: res.user._id || res.user.id };
          setUser(userData);
          setView(userData.role);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch data when user is logged in
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [testsData, attemptsData, materialsData] = await Promise.all([
        api("tests"),
        api("attempts"),
        api("materials"),
      ]);
      
      setTests(testsData);
      setAttempts(attemptsData);
      setMaterials(materialsData);

      // Only admins can fetch all users
      if (user.role === 'admin') {
        const usersData = await api("users");
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer for test
  const submitTest = useCallback(async () => {
    if (!currentTest || !user) return;

    let score = 0;
    currentTest.questions.forEach((q, idx) => {
      if (answers[idx] === q.correct) score++;
    });

    try {
      await api("attempts", "POST", {
        testId: currentTest.id,
        score,
        total: currentTest.questions.length,
        answers,
      });

      alert(`Test submitted! Score: ${score}/${currentTest.questions.length}`);
      
      setCurrentTest(null);
      setAnswers({});
      setView("student");
      
      // Refresh attempts
      const attemptsData = await api("attempts");
      setAttempts(attemptsData);
    } catch (error: any) {
      alert(error.message || "Failed to submit test");
    }
  }, [currentTest, user, answers]);

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
  }, [currentTest, timeLeft, submitTest]);

  const login = async (email: string, password: string) => {
    const res = await api("auth", "POST", {
      email,
      password,
      mode: "login",
    });

    if (res.token) {
      localStorage.setItem("token", res.token);
      const userData = { ...res.user, id: res.user._id || res.user.id };
      setUser(userData);
      setView(userData.role);
    } else {
      throw new Error(res.message || "Login failed");
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: 'student' | 'teacher',
    course: string = ''
  ) => {
    const res = await api("auth", "POST", {
      email,
      password,
      name,
      role,
      course,
      mode: "register",
    });

    if (res.error) {
      throw new Error(res.message || "Registration failed");
    }

    return res.message || "Registered successfully";
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setUsers([]);
    setTests([]);
    setAttempts([]);
    setMaterials([]);
    setView('login');
    setCurrentTest(null);
    setAnswers({});
  };

  const addCourse = async (name: string, description: string) => {
    await api("courses", "POST", { name, description });
    const coursesData = await api("courses");
    setCourses(coursesData);
  };

  const addTest = async (
    title: string,
    course: string,
    subject: string,
    duration: number,
    questions: Question[]
  ) => {
    await api("tests", "POST", {
      title,
      course,
      subject,
      duration,
      questions,
    });

    const testsData = await api("tests");
    setTests(testsData);
  };

  const addMaterial = async (
    title: string,
    course: string,
    subject: string,
    content: string,
    type: 'notes' | 'video' | 'pdf'
  ) => {
    await api("materials", "POST", {
      title,
      course,
      subject,
      content,
      type,
    });

    const materialsData = await api("materials");
    setMaterials(materialsData);
  };

  const toggleTestActive = async (testId: string, active: boolean) => {
    await api(`tests/${testId}`, "PATCH", { active });
    const testsData = await api("tests");
    setTests(testsData);
  };

  const startTest = (test: Test) => {
    setCurrentTest(test);
    setAnswers({});
    setTimeLeft(test.duration * 60);
    setView('taking-test');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Award className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const LoginView: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
      email: "",
      password: "",
      name: "",
      role: "student" as "student" | "teacher",
      course: "",
    });

    const handleLogin = async () => {
      setError("");
      if (!formData.email || !formData.password) {
        setError("Email and password are required");
        return;
      }

      try {
        setSubmitting(true);
        await login(formData.email, formData.password);
      } catch (err: any) {
        setError(err.message || "Login failed");
      } finally {
        setSubmitting(false);
      }
    };

    const handleRegister = async () => {
      setError("");

      if (!formData.email || !formData.password || !formData.name) {
        setError("All fields are required");
        return;
      }

      if (formData.role === "student" && !formData.course) {
        setError("Please select a course");
        return;
      }

      try {
        setSubmitting(true);
        const message = await register(
          formData.email,
          formData.password,
          formData.name,
          formData.role,
          formData.course
        );
        alert(message);
        setIsLogin(true);
        setFormData({ ...formData, password: "" });
      } catch (err: any) {
        setError(err.message || "Registration failed");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Award className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Quiz Platform</h1>
            <p className="text-gray-600 mt-2">CET / JEE Test Preparation</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                isLogin ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                !isLogin ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />

            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />

            {!isLogin && (
              <>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "student" | "teacher",
                    })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>

                {formData.role === "student" && (
                  <select
                    value={formData.course}
                    onChange={(e) =>
                      setFormData({ ...formData, course: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            <button
              disabled={submitting}
              onClick={isLogin ? handleLogin : handleRegister}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {submitting ? "Please wait..." : isLogin ? "Login" : "Register"}
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-6 text-center">
            Demo: admin@quiz.com / admin123
          </p>
        </div>
      </div>
    );
  };

  const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState("users");
    const [courseForm, setCourseForm] = useState({ name: "", description: "" });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const pendingUsers = users.filter(
      (u) => !u.approved && u.role === "teacher"
    );
    const pendingTests = tests.filter((t) => !t.approved);

    const approveTeacher = async (id: string) => {
      setActionLoading(id);
      try {
        await api(`users/${id}/approve`, "PATCH");
        const usersData = await api("users");
        setUsers(usersData);
      } catch (error: any) {
        alert(error.message || "Failed to approve teacher");
      }
      setActionLoading(null);
    };

    const rejectTeacher = async (id: string) => {
      setActionLoading(id);
      try {
        await api(`users/${id}`, "DELETE");
        const usersData = await api("users");
        setUsers(usersData);
      } catch (error: any) {
        alert(error.message || "Failed to reject teacher");
      }
      setActionLoading(null);
    };

    const approveTest = async (id: string) => {
      setActionLoading(id);
      try {
        await api(`tests/${id}/approve`, "PATCH");
        const testsData = await api("tests");
        setTests(testsData);
      } catch (error: any) {
        alert(error.message || "Failed to approve test");
      }
      setActionLoading(null);
    };

    const rejectTest = async (id: string) => {
      setActionLoading(id);
      try {
        await api(`tests/${id}`, "DELETE");
        const testsData = await api("tests");
        setTests(testsData);
      } catch (error: any) {
        alert(error.message || "Failed to reject test");
      }
      setActionLoading(null);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Award className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 overflow-x-auto">
            {["users", "tests", "courses", "analytics"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">
                  Pending Approvals ({pendingUsers.length})
                </h2>

                {pendingUsers.length === 0 ? (
                  <p className="text-gray-500">No pending approvals</p>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-gray-600">
                            {u.email} – {u.role}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => approveTeacher(u.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                          >
                            {actionLoading === u.id ? "..." : "Approve"}
                          </button>
                          <button
                            disabled={actionLoading === u.id}
                            onClick={() => rejectTeacher(u.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
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
                <h2 className="text-xl font-bold mb-4">
                  All Users ({users.length})
                </h2>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex justify-between items-center p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-gray-600">
                          {u.email} – {u.role}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          u.approved
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {u.approved ? "Active" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tests" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">
                Pending Test Approvals ({pendingTests.length})
              </h2>

              {pendingTests.length === 0 ? (
                <p className="text-gray-500">No pending tests</p>
              ) : (
                <div className="space-y-3">
                  {pendingTests.map((t) => {
                    const teacher = users.find((u) => u.id === t.teacherId);

                    return (
                      <div key={t.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg">{t.title}</p>
                            <p className="text-sm text-gray-600">
                              By: {teacher?.name || "Unknown"} | Subject: {t.subject} | Duration:{" "}
                              {t.duration} min
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {t.questions.length} questions
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              disabled={actionLoading === t.id}
                              onClick={() => approveTest(t.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                            >
                              {actionLoading === t.id ? "..." : "Approve"}
                            </button>
                            <button
                              disabled={actionLoading === t.id}
                              onClick={() => rejectTest(t.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
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

          {activeTab === "courses" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Manage Courses</h2>

              <div className="mb-6 space-y-3">
                <input
                  type="text"
                  placeholder="Course Name"
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />

                <textarea
                  placeholder="Description"
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />

                <button
                  onClick={async () => {
                    if (courseForm.name) {
                      try {
                        await addCourse(courseForm.name, courseForm.description);
                        setCourseForm({ name: "", description: "" });
                      } catch (error: any) {
                        alert(error.message || "Failed to add course");
                      }
                    }
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Add Course
                </button>
              </div>

              <div className="space-y-2">
                {courses.map((c) => (
                  <div key={c.id} className="p-4 border rounded-lg">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-sm text-gray-600">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
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
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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

    const removeQuestion = (index: number) => {
      setTestForm(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    };

    const createTest = async () => {
      // First add any pending question
      let finalQuestions = [...testForm.questions];
      if (questionForm.question && questionForm.options.every(o => o)) {
        finalQuestions.push(questionForm);
      }

      if (!testForm.title || !testForm.course || !testForm.subject || finalQuestions.length === 0) {
        alert('Please fill all fields and add at least one question');
        return;
      }

      try {
        setActionLoading('create');
        await addTest(
          testForm.title,
          testForm.course,
          testForm.subject,
          testForm.duration,
          finalQuestions
        );

        alert('Test created! Awaiting admin approval.');

        setTestForm({
          title: '',
          course: '',
          subject: '',
          duration: 60,
          questions: [],
        });
        setQuestionForm({ question: '', options: ['', '', '', ''], correct: 0 });
        setActiveTab('tests');
      } catch (error: any) {
        alert(error.message || "Failed to create test");
      } finally {
        setActionLoading(null);
      }
    };

    const handleToggleActive = async (testId: string, currentActive: boolean) => {
      setActionLoading(testId);
      try {
        await toggleTestActive(testId, !currentActive);
      } catch (error: any) {
        alert(error.message || "Failed to update test");
      }
      setActionLoading(null);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <span className="text-xl font-bold">Teacher Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button 
                onClick={logout} 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 overflow-x-auto">
            {['tests', 'create-test', 'materials'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
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
                  <button 
                    onClick={() => setActiveTab('create-test')}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Create Your First Test
                  </button>
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
                          disabled={actionLoading === t.id}
                          onClick={() => handleToggleActive(t.id, t.active)} 
                          className={`px-4 py-2 rounded-lg disabled:opacity-60 ${t.active ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                          {actionLoading === t.id ? '...' : t.active ? 'Deactivate' : 'Activate'}
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
                    onChange={e => setTestForm({...testForm, duration: parseInt(e.target.value) || 60})} 
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
                        type="button"
                        onClick={() => setQuestionForm({...questionForm, correct: idx})} 
                        className={`px-4 py-2 rounded-lg transition ${questionForm.correct === idx ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                        {questionForm.correct === idx ? '✓ Correct' : 'Set Correct'}
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button"
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
                      <div key={idx} className="p-3 bg-gray-50 rounded mb-2 flex justify-between items-start">
                        <div>
                          <p className="font-medium">Q{idx + 1}: {q.question}</p>
                          <p className="text-sm text-green-600">Correct: {q.options[q.correct]}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  disabled={actionLoading === 'create'}
                  onClick={createTest} 
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {actionLoading === 'create' ? 'Creating...' : 'Submit Test for Approval'}
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
                  onClick={async () => { 
                    if(materialForm.title && materialForm.content) { 
                      try {
                        await addMaterial(materialForm.title, materialForm.course, materialForm.subject, materialForm.content, materialForm.type); 
                        setMaterialForm({ title: '', course: '', subject: '', content: '', type: 'notes' });
                      } catch (error: any) {
                        alert(error.message || "Failed to upload material");
                      }
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
                  {materials.filter(m => m.teacherId === user!.id).length === 0 ? (
                    <p className="text-gray-500">No materials uploaded yet</p>
                  ) : (
                    materials.filter(m => m.teacherId === user!.id).map(m => (
                      <div key={m.id} className="p-4 border rounded-lg">
                        <p className="font-medium">{m.title}</p>
                        <p className="text-sm text-gray-600">{m.subject} | {m.type}</p>
                      </div>
                    ))
                  )}
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
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button 
                onClick={logout} 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 overflow-x-auto">
            {['tests', 'results', 'materials'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
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
                availableTests.map(t => {
                  const alreadyAttempted = myAttempts.some(a => a.testId === t.id);
                  return (
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
                          disabled={alreadyAttempted}
                          className={`px-6 py-2 rounded-lg font-medium ${
                            alreadyAttempted 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {alreadyAttempted ? 'Already Attempted' : 'Start Test'}
                        </button>
                      </div>
                    </div>
                  );
                })
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
                          <h3 className="text-xl font-bold">{test?.title || 'Unknown Test'}</h3>
                          <p className="text-gray-600">{test?.subject}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(a.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${
                            parseFloat(percentage) >= 70 ? 'text-green-600' : 
                            parseFloat(percentage) >= 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>{percentage}%</p>
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
        <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{currentTest.title}</h2>
              <p className="text-sm text-gray-600">{currentTest.subject}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-blue-100 text-blue-800'}`}>
                <Clock className="w-5 h-5" />
                <span className="font-bold font-mono">{formatTime(timeLeft)}</span>
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

          <div className="mt-8 flex justify-between items-center bg-white rounded-lg shadow p-4">
            <p className="text-gray-600">
              Answered: <span className="font-bold">{Object.keys(answers).length}/{currentTest.questions.length}</span>
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