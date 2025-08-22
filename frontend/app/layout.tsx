export const metadata = { title: "Insyd Notification POC" };
import { ToastContainer } from "react-toastify";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}
        <ToastContainer />
      </body>
    </html>
  );
}
