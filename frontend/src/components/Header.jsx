import React from 'react';
import Button from './Button';

const Header = ({ title, buttonText, onButtonClick, children }) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      {buttonText && onButtonClick && (
        <Button onClick={onButtonClick} variant="primary">
          {buttonText}
        </Button>
      )}
      {children}
    </div>
  );
};

export default Header;
