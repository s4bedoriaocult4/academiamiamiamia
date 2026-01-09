import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, Award, AlertCircle, Plus, X, Check, Clock, Search } from 'lucide-react';

const GymManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({});

  const plans = [
    { id: '1x', name: '1x por semana', price: 115, frequency: 1 },
    { id: '2x', name: '2x por semana', price: 134, frequency: 2 },
    { id: '3x', name: '3x por semana', price: 145, frequency: 3 },
    { id: 'livre', name: 'Livre (todos os dias)', price: 165, frequency: 99 },
    { id: 'plus', name: 'Plus (até 2 treinos/dia)', price: 200, frequency: 999 }
  ];

  const dueOptions = [5, 10, 15, 20];
  const graduations = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const studentsData = await window.storage.get('students');
      const paymentsData = await window.storage.get('payments');
      const attendanceData = await window.storage.get('attendance');
      
      if (studentsData) setStudents(JSON.parse(studentsData.value));
      if (paymentsData) setPayments(JSON.parse(paymentsData.value));
      if (attendanceData) setAttendance(JSON.parse(attendanceData.value));
    } catch (error) {
      console.log('Iniciando sistema novo');
    }
  };

  const saveStudents = async (data) => {
    setStudents(data);
    await window.storage.set('students', JSON.stringify(data));
  };

  const savePayments = async (data) => {
    setPayments(data);
    await window.storage.set('payments', JSON.stringify(data));
  };

  const saveAttendance = async (data) => {
    setAttendance(data);
    await window.storage.set('attendance', JSON.stringify(data));
  };

  const getNextDueDate = (startDate, dueDay) => {
    const start = new Date(startDate);
    const month = start.getMonth();
    const year = start.getFullYear();
    const due = new Date(year, month, dueDay);
    
    if (due <= start) {
      due.setMonth(month + 1);
    }
    return due.toISOString().split('T')[0];
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openModal = (type, student = null) => {
    setModalType(type);
    setSelectedStudent(student);
    
    if (type === 'addStudent') {
      setFormData({
        name: '',
        phone: '',
        plan: '1x',
        dueDay: 5,
        startDate: new Date().toISOString().split('T')[0],
        graduation: 'Branca'
      });
    } else if (type === 'editStudent' && student) {
      setFormData({
        name: student.name,
        phone: student.phone,
        plan: student.plan,
        dueDay: student.dueDay,
        graduation: student.graduation,
        status: student.status
      });
    } else if (type === 'payment') {
      setFormData({
        studentId: '',
        amount: '',
        method: 'PIX',
        date: new Date().toISOString().split('T')[0],
        referenceMonth: new Date().toISOString().slice(0, 7)
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setFormData({});
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddStudent = async () => {
    if (!formData.name || !formData.phone) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const startDate = formData.startDate;
    const dueDay = parseInt(formData.dueDay);
    
    const newStudent = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      plan: formData.plan,
      dueDay: dueDay,
      startDate: startDate,
      nextDue: getNextDueDate(startDate, dueDay),
      graduation: formData.graduation,
      status: 'ativo',
      createdAt: new Date().toISOString()
    };

    await saveStudents([...students, newStudent]);
    closeModal();
  };

  const handleUpdateStudent = async () => {
    if (!formData.name || !formData.phone) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const updated = students.map(s => 
      s.id === selectedStudent.id 
        ? {
            ...s,
            name: formData.name,
            phone: formData.phone,
            plan: formData.plan,
            dueDay: parseInt(formData.dueDay),
            graduation: formData.graduation,
            status: formData.status
          }
        : s
    );

    await saveStudents(updated);
    closeModal();
  };

  const deleteStudent = async (id) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      await saveStudents(students.filter(s => s.id !== id));
    }
  };

  const handleRegisterPayment = async () => {
    if (!formData.studentId || !formData.amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const student = students.find(s => s.id === formData.studentId);
    const plan = plans.find(p => p.id === student.plan);

    const payment = {
      id: Date.now().toString(),
      studentId: student.id,
      studentName: student.name,
      amount: parseFloat(formData.amount),
      method: formData.method,
      date: formData.date,
      referenceMonth: formData.referenceMonth,
      createdAt: new Date().toISOString()
    };

    await savePayments([...payments, payment]);

    const currentDue = new Date(student.nextDue);
    const newDue = new Date(currentDue);
    newDue.setMonth(currentDue.getMonth() + 1);
    
    const updated = students.map(s => 
      s.id === student.id 
        ? { ...s, nextDue: newDue.toISOString().split('T')[0] }
        : s
    );
    
    await saveStudents(updated);
    closeModal();
  };

  const registerAttendance = async (studentId) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendance.find(a => a.studentId === studentId && a.date === today);
    
    if (existing) {
      alert('Presença já registrada hoje!');
      return;
    }

    const student = students.find(s => s.id === studentId);
    const newAttendance = {
      id: Date.now().toString(),
      studentId,
      studentName: student.name,
      date: today,
      createdAt: new Date().toISOString()
    };

    await saveAttendance([...attendance, newAttendance]);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const activeStudents = students.filter(s => s.status === 'ativo');
  const overdueStudents = activeStudents.filter(s => isOverdue(s.nextDue));
  const dueThisWeek = activeStudents.filter(s => {
    const days = getDaysUntilDue(s.nextDue);
    return days >= 0 && days <= 7;
  });

  const thisMonthRevenue = payments
    .filter(p => {
      const pDate = new Date(p.date);
      const now = new Date();
      return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const expectedRevenue = activeStudents.reduce((sum, s) => {
    const plan = plans.find(p => p.id === s.plan);
    return sum + (plan?.price || 0);
  }, 0);

  const todayAttendance = attendance.filter(a => 
    a.date === new Date().toISOString().split('T')[0]
  ).length;

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Alunos Ativos</p>
              <p className="text-3xl font-bold text-blue-900">{activeStudents.length}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Receita Mensal</p>
              <p className="text-3xl font-bold text-green-900">R$ {thisMonthRevenue.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-1">Esperado: R$ {expectedRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Inadimplentes</p>
              <p className="text-3xl font-bold text-orange-900">{overdueStudents.length}</p>
            </div>
            <AlertCircle className="text-orange-500" size={32} />
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Presenças Hoje</p>
              <p className="text-3xl font-bold text-purple-900">{todayAttendance}</p>
            </div>
            <Clock className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {overdueStudents.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2">
            <AlertCircle size={20} />
            Alunos com Pagamento Atrasado
          </h3>
          <div className="space-y-2">
            {overdueStudents.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gray-600">Vencimento: {new Date(s.nextDue).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-red-600 font-bold">
                  {Math.abs(getDaysUntilDue(s.nextDue))} dias
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dueThisWeek.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-bold mb-3 flex items-center gap-2">
            <Calendar size={20} />
            Vencimentos nos Próximos 7 Dias
          </h3>
          <div className="space-y-2">
            {dueThisWeek.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-gray-600">Vencimento: {new Date(s.nextDue).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-yellow-600 font-bold">
                  {getDaysUntilDue(s.nextDue)} dias
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-4">
      <div className="flex gap-4 items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar aluno por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={() => openModal('addStudent')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Novo Aluno
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Telefone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Plano</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Graduação</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Vencimento</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStudents.map(student => {
              const plan = plans.find(p => p.id === student.plan);
              const overdue = isOverdue(student.nextDue);
              
              return (
                <tr key={student.id} className={overdue ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.phone}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{plan?.name}</p>
                      <p className="text-sm text-gray-600">R$ {plan?.price}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{student.graduation}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">Dia {student.dueDay}</p>
                      <p className={`text-sm ${overdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {new Date(student.nextDue).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => registerAttendance(student.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Registrar Presença"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => openModal('editStudent', student)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Excluir"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pagamentos</h2>
        <button
          onClick={() => openModal('payment')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <Plus size={20} />
          Registrar Pagamento
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aluno</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Referência</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Método</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.sort((a, b) => new Date(b.date) - new Date(a.date)).map(payment => (
              <tr key={payment.id}>
                <td className="px-4 py-3">{new Date(payment.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">{payment.studentName}</td>
                <td className="px-4 py-3">{payment.referenceMonth}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {payment.method}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-green-600">R$ {payment.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendanceList = attendance.filter(a => a.date === today);
    
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Presenças - Hoje</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeStudents.map(student => {
            const hasAttendance = todayAttendanceList.some(a => a.studentId === student.id);
            
            return (
              <div
                key={student.id}
                className={`p-4 rounded-lg border-2 ${
                  hasAttendance 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{student.name}</p>
                    <p className="text-sm text-gray-600">{plans.find(p => p.id === student.plan)?.name}</p>
                  </div>
                  {hasAttendance ? (
                    <Check className="text-green-600" size={24} />
                  ) : (
                    <button
                      onClick={() => registerAttendance(student.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Marcar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">
              {modalType === 'addStudent' && 'Novo Aluno'}
              {modalType === 'editStudent' && 'Editar Aluno'}
              {modalType === 'payment' && 'Registrar Pagamento'}
            </h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          {(modalType === 'addStudent' || modalType === 'editStudent') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefone *</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Plano</label>
                <select
                  value={formData.plan || '1x'}
                  onChange={(e) => handleFormChange('plan', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - R$ {p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Dia de Vencimento</label>
                <select
                  value={formData.dueDay || 5}
                  onChange={(e) => handleFormChange('dueDay', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {dueOptions.map(d => (
                    <option key={d} value={d}>Dia {d}</option>
                  ))}
                </select>
              </div>

              {modalType === 'addStudent' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Graduação</label>
                <select
                  value={formData.graduation || 'Branca'}
                  onChange={(e) => handleFormChange('graduation', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {graduations.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {modalType === 'editStudent' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status || 'ativo'}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              )}

              <button
                onClick={modalType === 'addStudent' ? handleAddStudent : handleUpdateStudent}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                {modalType === 'addStudent' ? 'Cadastrar' : 'Salvar'}
              </button>
            </div>
          )}

          {modalType === 'payment' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Aluno *</label>
                <select
                  value={formData.studentId || ''}
                  onChange={(e) => handleFormChange('studentId', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Selecione...</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Método de Pagamento</label>
                <select
                  value={formData.method || 'PIX'}
                  onChange={(e) => handleFormChange('method', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão Crédito">Cartão Crédito</option>
                  <option value="Link Pagamento">Link de Pagamento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Referência (Mês)</label>
                <input
                  type="month"
                  value={formData.referenceMonth || ''}
                  onChange={(e) => handleFormChange('referenceMonth', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <button
                onClick={handleRegisterPayment}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Registrar Pagamento
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Sistema de Gestão - Academia</h1>
          <p className="text-sm text-blue-100">Controle completo de alunos, pagamentos e presenças</p>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'students'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Alunos
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pagamentos
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Presenças
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'students' && renderStudents()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'attendance' && renderAttendance()}
        </div>
      </div>

      {renderModal()}
    </div>
  );
};

export default GymManagementSystem;