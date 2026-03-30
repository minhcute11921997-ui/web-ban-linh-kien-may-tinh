import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import bannerLeft from "../assets/banner-left.png";
import bannerRight from "../assets/banner-right.png";

const CustomerLayout = ({ children }) => (
  <>
    <Navbar />
    <div className="min-h-screen bg-gray-50">
      <div className="flex gap-3 px-4 py-6 max-w-screen-2xl mx-auto">
        <div className="w-36 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <a href="/" className="block rounded-xl overflow-hidden shadow hover:opacity-90 transition-all duration-200">
              <img src={bannerLeft} alt="Banner trái" className="w-full h-auto object-cover" />
            </a>
          </div>
        </div>
        <main className="flex-1 min-w-0">{children}</main>
        <div className="w-36 flex-shrink-0 hidden lg:block">
          <div className="sticky top-4">
            <a href="/" className="block rounded-xl overflow-hidden shadow hover:opacity-90 transition-all duration-200">
              <img src={bannerRight} alt="Banner phải" className="w-full h-auto object-cover" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </>
);

export default CustomerLayout;