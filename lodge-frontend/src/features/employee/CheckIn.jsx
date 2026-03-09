import { useEffect, useRef, useState } from "react";
import {
  ID_TYPES,
  calculateBookingAmounts,
  calculateNights,
  createEmptyCheckInForm,
  formatCurrency,
} from "../../utils/hotel";

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CheckIn({ rooms, settings, submitting, onSubmit }) {
  const [formData, setFormData] = useState(createEmptyCheckInForm());
  const [formError, setFormError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const availableRooms = rooms.filter((room) => room.status === "available");
  const selectedRoom = availableRooms.find((room) => String(room.id) === String(formData.roomId));
  const stayNights = calculateNights(formData.arrivalDate, formData.departureDate);
  const bookingAmounts = calculateBookingAmounts(
    formData.roomRent,
    stayNights,
    formData.advancePayment,
    settings.gstPercentage,
  );

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleRoomChange(roomId) {
    const room = availableRooms.find((item) => String(item.id) === String(roomId));

    setFormData((current) => ({
      ...current,
      roomId,
      roomRent: room ? String(room.pricePerDay) : "",
    }));
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera capture is not available in this browser.");
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraError("");
      setCameraActive(true);
    } catch {
      setCameraError("Could not access the camera. Check browser permissions and try again.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    updateField("guestPhoto", canvas.toDataURL("image/jpeg", 0.85));
    stopCamera();
  }

  async function handleFileUpload(event, field) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileData = await fileToDataUrl(file);
    updateField(field, fileData);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.guestName.trim() || !formData.phone.trim() || !formData.idNumber.trim()) {
      setFormError("Guest name, phone number, and ID number are required.");
      return;
    }

    if (!formData.roomId) {
      setFormError("Select an available room before continuing.");
      return;
    }

    if (Number(formData.roomRent) <= 0) {
      setFormError("Enter a valid room rent amount.");
      return;
    }

    if (stayNights <= 0) {
      setFormError("Departure date must be after the arrival date.");
      return;
    }

    try {
      setFormError("");
      await onSubmit({
        ...formData,
        roomId: Number(formData.roomId),
        roomRent: Number(formData.roomRent),
        adults: Number(formData.adults),
        children: Number(formData.children),
        advancePayment: Number(formData.advancePayment),
      });
      setFormData(createEmptyCheckInForm());
      stopCamera();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <form className="module-card" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p className="section-overline">Guest Registration</p>
          <h2>Complete Check-In</h2>
        </div>
        <div className="summary-chip">
          {selectedRoom ? `${selectedRoom.number} - ${selectedRoom.type}` : `${availableRooms.length} rooms available`}
        </div>
      </div>

      <div className="form-layout">
        <section className="form-section">
          <h3>Personal Details</h3>
          <label>
            Full Name
            <input required value={formData.guestName} onChange={(event) => updateField("guestName", event.target.value)} />
          </label>
          <label>
            Phone
            <input required value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>
          <label>
            Email
            <input value={formData.email} onChange={(event) => updateField("email", event.target.value)} />
          </label>
          <label>
            Address
            <textarea
              rows="4"
              value={formData.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </label>
          <label>
            Nationality
            <input
              required
              value={formData.nationality}
              onChange={(event) => updateField("nationality", event.target.value)}
            />
          </label>
        </section>

        <section className="form-section">
          <h3>Identity & Photos</h3>
          <label>
            ID Type
            <select value={formData.idType} onChange={(event) => updateField("idType", event.target.value)}>
              {ID_TYPES.map((idType) => (
                <option key={idType} value={idType}>
                  {idType}
                </option>
              ))}
            </select>
          </label>
          <label>
            ID Number
            <input required value={formData.idNumber} onChange={(event) => updateField("idNumber", event.target.value)} />
          </label>
          <label className="file-field">
            Upload Scanned ID
            <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "idPhoto")} />
          </label>
          <label className="file-field">
            Upload Guest Photo
            <input type="file" accept="image/*" onChange={(event) => handleFileUpload(event, "guestPhoto")} />
          </label>

          <div className="camera-panel">
            <div className="camera-actions">
              <button type="button" className="button button--ghost" onClick={startCamera}>
                Start Camera
              </button>
              <button type="button" className="button button--ghost" onClick={capturePhoto} disabled={!cameraActive}>
                Capture Photo
              </button>
              <button type="button" className="button button--ghost" onClick={stopCamera} disabled={!cameraActive}>
                Stop Camera
              </button>
            </div>

            {cameraError ? <p className="inline-message inline-message--error">{cameraError}</p> : null}

            <div className="media-preview-grid">
              <div className="media-frame media-frame--video">
                <video ref={videoRef} muted playsInline />
              </div>
              <div className="media-frame">
                {formData.idPhoto ? <img src={formData.idPhoto} alt="Uploaded ID proof" /> : <span>ID preview</span>}
              </div>
              <div className="media-frame">
                {formData.guestPhoto ? <img src={formData.guestPhoto} alt="Guest preview" /> : <span>Guest photo</span>}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden-canvas" />
          </div>
        </section>

        <section className="form-section">
          <h3>Stay Details</h3>
          <label>
            Arrival Date
            <input
              type="date"
              required
              value={formData.arrivalDate}
              onChange={(event) => updateField("arrivalDate", event.target.value)}
            />
          </label>
          <label>
            Departure Date
            <input
              type="date"
              required
              value={formData.departureDate}
              onChange={(event) => updateField("departureDate", event.target.value)}
            />
          </label>
          <label>
            Room
            <select required value={formData.roomId} onChange={(event) => handleRoomChange(event.target.value)}>
              <option value="">Select an available room</option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.number} - {room.type} - {formatCurrency(room.pricePerDay)}/night
                </option>
              ))}
            </select>
          </label>
          <label>
            Room Rent / Night
            <input
              required
              type="number"
              min="1"
              value={formData.roomRent}
              onChange={(event) => updateField("roomRent", event.target.value)}
            />
          </label>
          <div className="compact-grid">
            <label>
              Adults
              <input
                type="number"
                min="1"
                value={formData.adults}
                onChange={(event) => updateField("adults", event.target.value)}
              />
            </label>
            <label>
              Children
              <input
                type="number"
                min="0"
                value={formData.children}
                onChange={(event) => updateField("children", event.target.value)}
              />
            </label>
          </div>
          <label>
            Advance Payment
            <input
              type="number"
              min="0"
              value={formData.advancePayment}
              onChange={(event) => updateField("advancePayment", event.target.value)}
            />
          </label>
          <label>
            Special Requests
            <textarea
              rows="4"
              value={formData.specialRequests}
              onChange={(event) => updateField("specialRequests", event.target.value)}
            />
          </label>
        </section>
      </div>

      <div className="booking-summary">
        <div>
          <span className="summary-label">Stay Duration</span>
          <strong>{stayNights || 0} night(s)</strong>
        </div>
        <div>
          <span className="summary-label">Nightly Rate</span>
          <strong>{formatCurrency(bookingAmounts.roomRent)}</strong>
        </div>
        <div>
          <span className="summary-label">Room Tariff</span>
          <strong>{formatCurrency(bookingAmounts.roomTariff)}</strong>
        </div>
        <div>
          <span className="summary-label">GST ({bookingAmounts.gstPercentage}%)</span>
          <strong>{formatCurrency(bookingAmounts.gstAmount)}</strong>
        </div>
        <div>
          <span className="summary-label">Final Amount</span>
          <strong>{formatCurrency(bookingAmounts.finalAmount)}</strong>
        </div>
      </div>

      {formError ? <p className="inline-message inline-message--error">{formError}</p> : null}

      <div className="module-actions">
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? "Saving Booking..." : "Complete Check-In"}
        </button>
      </div>
    </form>
  );
}
