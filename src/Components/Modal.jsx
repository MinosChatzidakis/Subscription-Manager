import "../pages/SubscriptionsPage.css";

const Modal = ({
  closeModal = () => {},
  onSave = () => {},
  children,
  message = "", //editing or creating
  saveMessage = "",
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{message}</h3>
          <button onClick={closeModal} className="close-btn">
            ✕
          </button>
        </div>
        <form onSubmit={onSave}>
          {children}
          <div className="modal-actions">
            <button type="button" onClick={closeModal} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              {saveMessage}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
