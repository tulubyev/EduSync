interface UserManagementProps {
  isVisible: boolean;
  users: any[];
  isLoading: boolean;
  userRole: string;
}

export function UserManagement({ isVisible, users, isLoading, userRole }: UserManagementProps) {
  if (!isVisible) return null;

  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>👥 Управление пользователями</h2>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>Загрузка пользователей...</div>
        </div>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Пользователи не найдены
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {users.map((userItem: any) => (
                <div key={userItem.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                      {userItem.firstName} {userItem.lastName}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                      📞 {userItem.phone} • ✉️ {userItem.email}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      ID: {userItem.id} • Роль: {userItem.adminRole || 'Пользователь'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      Верификация: 
                      <span style={{ margin: '0 5px' }}>
                        Уровень 1: {userItem.isVerified ? '✅' : '❌'}
                      </span>
                      <span style={{ margin: '0 5px' }}>
                        Уровень 2: {userItem.verificationLevel2 ? '✅' : '❌'}
                      </span>
                      <span style={{ margin: '0 5px' }}>
                        Уровень 3: {userItem.verificationLevel3 ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    <button 
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => {
                        alert(`Просмотр пользователя: ${userItem.firstName} ${userItem.lastName}\nID: ${userItem.id}\nТелефон: ${userItem.phone}\nEmail: ${userItem.email}`);
                      }}
                    >
                      👁️ Просмотр
                    </button>
                    {userRole === 'super_admin' && (
                      <button 
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onClick={() => {
                          const newRole = prompt('Назначить админскую роль (super_admin, devops_admin, analytics_admin, finance_admin, api_admin, security_admin) или оставить пустым для удаления роли:', userItem.adminRole || '');
                          if (newRole !== null) {
                            alert(`Функция изменения ролей будет реализована в следующих версиях.\nПользователь: ${userItem.firstName} ${userItem.lastName}\nНовая роль: ${newRole || 'Обычный пользователь'}`);
                          }
                        }}
                      >
                        🔧 Изменить роль
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}