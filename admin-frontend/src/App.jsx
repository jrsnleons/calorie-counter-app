
import { useState, useEffect } from 'react'

const HistoryModal = ({ user, onClose, sessionKey }) => {
    const [history, setHistory] = useState({ meals: [], weights: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/admin/users/${user.id}/history`, {
                    headers: { 'x-admin-secret': sessionKey }
                });
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user.id, sessionKey]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            animation: 'fadeIn 0.2s ease-in-out'
        }}>
            <div style={{ 
                background: 'white', 
                borderRadius: '1rem', 
                width: '95%', 
                maxWidth: '900px', 
                height: '80vh', 
                display: 'flex', 
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9fafb' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>History Log</h2>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>User: <span style={{fontWeight:'600', color:'#374151'}}>{user.name || 'Anonymous'}</span> (#{user.id})</div>
                    </div>
                    <button onClick={onClose} style={{ 
                        width: '2rem', height: '2rem', borderRadius: '50%', border: 'none', background: '#e5e7eb', 
                        color: '#374151', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s' 
                    }}
                    onMouseEnter={e => e.target.style.background = '#d1d5db'}
                    onMouseLeave={e => e.target.style.background = '#e5e7eb'}
                    >
                        &times;
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <div style={{ border: '3px solid #f3f3f3', borderTop: '3px solid #4f46e5', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ marginLeft: '1rem', color: '#6b7280' }}>Loading user data...</span>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.7fr)', height: '100%', overflow: 'hidden' }}>
                        {/* Meals Column */}
                        <div style={{ padding: '0', overflowY: 'auto', borderRight: '1px solid #e5e7eb', background: '#ffffff' }}>
                            <h3 style={{ position:'sticky', top:0, margin: 0, padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4b5563', fontWeight: '700', backdropFilter: 'blur(2px)' }}>
                                🥗 Meal Log ({history.meals.length})
                            </h3>
                            <div style={{ padding: '0' }}>
                                {history.meals.length === 0 && (
                                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9ca3af' }}>No meals recorded recently.</div>
                                )}
                                {history.meals.map((meal, idx) => (
                                    <div key={meal.id} style={{ 
                                        padding: '1rem 1.5rem', 
                                        borderBottom: '1px solid #f3f4f6', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        background: idx % 2 === 0 ? 'white' : '#f9fafb'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>{meal.food_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize' }}>
                                                    {meal.meal_type}
                                                </span>
                                                <span>{meal.date}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '700', color: '#059669' }}>{meal.calories}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>kcal</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weight Column */}
                        <div style={{ padding: '0', overflowY: 'auto', background: '#fcfcfc' }}>
                            <h3 style={{ position:'sticky', top:0, margin: 0, padding: '1rem 1.5rem', background: 'rgba(252,252,252,0.95)', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4b5563', fontWeight: '700', backdropFilter: 'blur(2px)' }}>
                                ⚖️ Weight Log ({history.weights.length})
                            </h3>
                            <div style={{ padding: '0' }}>
                                {history.weights.length === 0 && (
                                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9ca3af' }}>No weight entries found.</div>
                                )}
                                {history.weights.map((log, idx) => (
                                    <div key={log.id} style={{ 
                                        padding: '0.75rem 1.5rem', 
                                        borderBottom: '1px solid #f3f4f6', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        fontSize: '0.875rem'
                                    }}>
                                        <span style={{ color: '#4b5563', fontFamily: 'monospace' }}>{log.date}</span>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                            <span style={{ fontWeight: '700', color: '#111827' }}>{log.weight}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>kg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </div>
    )
}

const EditUserModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        tdee: user.tdee || 2000,
        current_streak: user.current_streak || 0,
        goal: user.goal || 'maintain',
        height: user.height || 0,
        weight: user.weight || 0
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'goal' || name === 'name' ? value : Number(value)
        }));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Edit User #{user.id}</h2>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.25rem' }}>Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.25rem' }}>Daily Calories (TDEE)</label>
                            <input type="number" name="tdee" value={formData.tdee} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                        </div>
                         <div>
                            <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.25rem' }}>Streak (Days)</label>
                            <input type="number" name="current_streak" value={formData.current_streak} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                        </div>
                    </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.25rem' }}>Height (cm)</label>
                            <input type="number" name="height" value={formData.height} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                        </div>
                         <div>
                            <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280', marginBottom: '0.25rem' }}>Weight (kg)</label>
                            <input type="number" name="weight" value={formData.weight} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(formData)} style={{ padding: '0.75rem 1.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const LoginScreen = ({ onLogin }) => {
    const [secret, setSecret] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Verify key by making a test request
        try {
            const res = await fetch('/api/admin/stats', { headers: { 'x-admin-secret': secret } });
            if (res.ok) {
                onLogin(secret);
            } else {
                setError("Invalid Admin Key");
            }
        } catch {
            setError("Server Error");
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Admin Login</h1>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                        type="password" 
                        placeholder="Enter Admin Secret Key" 
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', width: '100%', boxSizing: 'border-box' }}
                    />
                    {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>{error}</p>}
                    <button 
                        type="submit"
                        style={{ padding: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}
                    >
                        Access Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
};

function App() {
  const [sessionKey, setSessionKey] = useState(localStorage.getItem('adminKey') || null);
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ users: 0, meals: 0, weight_logs: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [historyUser, setHistoryUser] = useState(null);

  useEffect(() => {
    if (sessionKey) fetchData();
  }, [sessionKey])

  const handleLogin = (key) => {
      localStorage.setItem('adminKey', key);
      setSessionKey(key);
  };

  const handleLogout = () => {
      localStorage.removeItem('adminKey');
      setSessionKey(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const headers = { 'x-admin-secret': sessionKey };
        
        const [statsRes, usersRes] = await Promise.all([
            fetch('/api/admin/stats', { headers }),
            fetch('/api/admin/users', { headers })
        ]);

        if (statsRes.status === 401 || usersRes.status === 401) {
            handleLogout();
            return;
        }

        if (!statsRes.ok) throw new Error(`Stats: ${statsRes.status}`);
        
        const statsData = await statsRes.json();
        const usersData = await usersRes.json();

        setStats(statsData);
        setUsers(usersData);
    } catch (err) {
        console.error("Dashboard Error:", err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const saveUserChanges = async (userData) => {
      if (!editingUser) return;
      try {
          const res = await fetch(`/api/admin/users/${editingUser.id}/update`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'x-admin-secret': sessionKey
              },
              body: JSON.stringify(userData)
          });
          
          if (res.ok) {
              setEditingUser(null);
              fetchData();
          } else {
              alert("Update failed");
          }
      } catch (e) {
          alert("Error: " + e.message);
      }
  };
  
  const deleteUser = async (user) => {
      if(!confirm(`Are you SURE you want to delete user ${user.name || user.id}? This cannot be undone.`)) return;
      
       try {
          const res = await fetch(`/api/admin/users/${user.id}`, {
              method: 'DELETE',
              headers: { 'x-admin-secret': sessionKey }
          });
          
          if (res.ok) {
              fetchData();
          } else {
              alert("Delete failed");
          }
      } catch (e) {
          alert("Error: " + e.message);
      }
  };

  if (!sessionKey) return <LoginScreen onLogin={handleLogin} />;
  
  if (loading && !users.length) return <div style={{padding: '2rem'}}>Loading admin panel...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {editingUser && (
            <EditUserModal 
                user={editingUser} 
                onClose={() => setEditingUser(null)} 
                onSave={saveUserChanges} 
            />
        )}
        
        {historyUser && (
            <HistoryModal
                user={historyUser}
                onClose={() => setHistoryUser(null)}
                sessionKey={sessionKey}
            />
        )}

      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {error && <span style={{color: 'red'}}>⚠️ {error}</span>}
            <div style={{ padding: '0.5rem 1rem', background: '#e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                Logged in
            </div>
            <button onClick={handleLogout} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Stats Card */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.users}</p>
        </div>
         <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meals Logged</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.meals}</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight Entries</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats.weight_logs}</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: '600' }}>User Management (Recent 50)</h3>
            <button onClick={fetchData} style={{ fontSize: '0.875rem', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}>Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ background: '#f9fafb', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                    <tr>
                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>ID</th>
                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Streak</th>
                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody style={{ divideY: '1px solid #e5e7eb' }}>
                    {users.map(user => (
                        <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '1rem 1.5rem' }}>#{user.id}</td>
                            <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{user.name || 'Anonymous'}</td>
                            <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>{user.username}</td>
                            <td style={{ padding: '1rem 1.5rem' }}>
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' }}>
                                    {user.current_streak} days
                                </span>
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                 <button 
                                    onClick={() => setHistoryUser(user)}
                                    style={{ color: '#059669', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    History
                                </button>
                                <button 
                                    onClick={() => setEditingUser(user)}
                                    style={{ color: '#4f46e5', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Edit
                                </button>
                                <button 
                                    onClick={() => deleteUser(user)}
                                    style={{ color: '#ef4444', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}

export default App
