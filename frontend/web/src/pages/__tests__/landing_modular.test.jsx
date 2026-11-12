/* global jest, describe, it, expect, beforeEach */
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock API service
jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: { households: 1250, residents: 5200 },
        status: "success",
      },
    }),
    post: jest.fn().mockResolvedValue({ data: { data: {}, status: "success" } }),
    put: jest.fn().mockResolvedValue({ data: { data: {}, status: "success" } }),
    delete: jest.fn().mockResolvedValue({ data: { data: {}, status: "success" } }),
  },
}));

// Mock Auth Context
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

import Landing from "../public/Landing";
import LandingNavbar from "../../components/landing/LandingNavbar";
import LandingHeroPhone from "../../components/landing/LandingHeroPhone";
import LandingProtectionSection from "../../components/landing/LandingProtectionSection";
import LandingSheltersSection from "../../components/landing/LandingSheltersSection";
import LandingInstallGuideSection from "../../components/landing/LandingInstallGuideSection";
import LandingFooter from "../../components/landing/LandingFooter";

describe("Modular Landing Page & Subcomponents Verification", () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (Component, initialEntries = ["/"]) => {
    return renderToString(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {Component}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("renders Landing page with all extracted sections without throwing", () => {
    expect(() => {
      const html = renderWithProviders(<Landing />);
      expect(html).toContain("Intelligent Evacuation Routing for Every Household");
      expect(html).toContain("Download EvacRoute APK");
      expect(html).toContain("How EvacRoute Keeps Your Family Safe");
      expect(html).toContain("Know Your Nearest High-Ground Haven");
      expect(html).toContain("How to Install EvacRoute on Your Phone");
      expect(html).toContain("Zamboanga City Emergency Network");
      expect(html).toContain("Interactive Preview");
    }).not.toThrow();
  });

  it("renders LandingNavbar individually with nav links and theme toggle", () => {
    expect(() => {
      const html = renderWithProviders(
        <LandingNavbar
          overviewSlide={0}
          scrolled={false}
          activeSection="overview"
          navItems={[
            { id: "overview", label: "Overview" },
            { id: "protection", label: "Protection" },
          ]}
          navRefs={{ current: {} }}
          underlineStyle={{ left: 0, width: 0, opacity: 0 }}
          scrollToSection={jest.fn()}
          darkMode={false}
          toggleDarkMode={jest.fn()}
          handleDownload={jest.fn()}
          mobileMenuOpen={false}
          setMobileMenuOpen={jest.fn()}
        />
      );
      expect(html).toContain("EvacRoute");
      expect(html).toContain("CDRRMO");
      expect(html).toContain("Download APK");
    }).not.toThrow();
  });

  it("renders LandingHeroPhone interactive preview frame across screens", () => {
    expect(() => {
      const mapHtml = renderWithProviders(
        <LandingHeroPhone
          overviewSlide={0}
          setOverviewSlide={jest.fn()}
          darkMode={false}
          activeResidentScreen="map"
          setActiveResidentScreen={jest.fn()}
          isNavigating={false}
          setIsNavigating={jest.fn()}
          reportSubmitted={false}
          setReportSubmitted={jest.fn()}
          passSaved={false}
          setPassSaved={jest.fn()}
        />
      );
      expect(mapHtml).toContain("Evacuation Map");
      expect(mapHtml).toContain("Interactive Preview");

      const reportHtml = renderWithProviders(
        <LandingHeroPhone
          overviewSlide={0}
          setOverviewSlide={jest.fn()}
          darkMode={false}
          activeResidentScreen="report"
          setActiveResidentScreen={jest.fn()}
          isNavigating={false}
          setIsNavigating={jest.fn()}
          reportSubmitted={false}
          setReportSubmitted={jest.fn()}
          passSaved={false}
          setPassSaved={jest.fn()}
        />
      );
      expect(reportHtml).toContain("Report Hazard");

      const profileHtml = renderWithProviders(
        <LandingHeroPhone
          overviewSlide={0}
          setOverviewSlide={jest.fn()}
          darkMode={false}
          activeResidentScreen="profile"
          setActiveResidentScreen={jest.fn()}
          isNavigating={false}
          setIsNavigating={jest.fn()}
          reportSubmitted={false}
          setReportSubmitted={jest.fn()}
          passSaved={false}
          setPassSaved={jest.fn()}
        />
      );
      expect(profileHtml).toContain("Profile");
    }).not.toThrow();
  });

  it("renders LandingProtectionSection with telemetry and 3 pillars", () => {
    expect(() => {
      const html = renderWithProviders(<LandingProtectionSection />);
      expect(html).toContain("Dynamic Threat-Avoidance Routing");
      expect(html).toContain("Offline Cryptographic Family Passports");
      expect(html).toContain("Sub-30-Second Emergency SOS Propagation");
    }).not.toThrow();
  });

  it("renders LandingSheltersSection with verified shelters and download CTA", () => {
    expect(() => {
      const html = renderWithProviders(
        <LandingSheltersSection handleDownload={jest.fn()} />
      );
      expect(html).toContain("Sample Verified High-Ground Centers");
      expect(html).toContain("Tetuan Central Evacuation Center");
      expect(html).toContain("Download App to Access All 112 Centers Offline");
    }).not.toThrow();
  });

  it("renders LandingInstallGuideSection with sideloading steps and package info", () => {
    expect(() => {
      const html = renderWithProviders(
        <LandingInstallGuideSection handleDownload={jest.fn()} downloading={false} />
      );
      expect(html).toContain("Android Sideloading Walkthrough");
      expect(html).toContain("Download the Official Package");
      expect(html).toContain("Enable Package Installation");
      expect(html).toContain("Register Household Profile");
    }).not.toThrow();
  });

  it("renders LandingFooter with hotlines, navigation, and staff portal link", () => {
    expect(() => {
      const html = renderWithProviders(
        <LandingFooter
          scrollToSection={jest.fn()}
          handleDownload={jest.fn()}
          overviewSlide={0}
          isIOS={false}
          navItems={[{ id: "overview", label: "Overview" }]}
          activeSection="overview"
        />
      );
      expect(html).toContain("Zamboanga Emergency Hotlines");
      expect(html).toContain("City Emergency (CDRRMO)");
      expect(html).toContain("Staff Portal");
    }).not.toThrow();
  });
});
