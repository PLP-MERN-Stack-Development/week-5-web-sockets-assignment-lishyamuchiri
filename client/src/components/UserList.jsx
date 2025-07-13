import React from 'react';

function UserList({ users, selectedUser, onSelectUser }) {
  return (
    <div className="w-full md:w-1/4 p-4 border-r border-white border-opacity-20">
      <h2 className="text-xl font-bold text-white mb-4">Users</h2>
      {users.map((user) => (
        <button
          key={user}
          onClick={() => onSelectUser(user)}
          className={`w-full p-2 mb-2 rounded-lg text-left ${
            selectedUser === user
              ? 'bg-purple-500 text-white'
              : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
          }`}
        >
          {user}
        </button>
      ))}
    </div>
  );
}

export default UserList;