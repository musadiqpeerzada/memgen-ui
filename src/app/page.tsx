"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sun, Moon } from "lucide-react";
// Types
interface MemeResponse {
  error?: string;
  meme_images?: string[];
}

// Constants
// take base url from env
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const MAX_MEMES = 5;
const MIN_MEMES = 1;

// Google Analytics helper
type GtagAction = "event" | "config" | "js";
type GtagParams = {
  event_category?: string;
  event_label?: string;
  value?: number;
};

declare global {
  interface Window {
    gtag: (action: GtagAction, eventName: string, params?: GtagParams) => void;
  }
}

export default function Home() {
  // State
  const [url, setUrl] = useState("");
  const [count, setCount] = useState(1);
  const [memes, setMemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Effects
  useEffect(() => {
    const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(script2);

    return () => {
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const trackEvent = (action: string, label?: string, value?: number) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", action, {
        event_category: "MemeGen",
        event_label: label,
        value: value,
      });
    }
  };

  const validateUrl = (url: string): boolean => {
    return url.trim().length > 0;
  };

  const validateCount = (count: number): boolean => {
    return count >= MIN_MEMES && count <= MAX_MEMES;
  };

  const generateMemes = async () => {
    setError(null);
    setMemes([]);

    if (!validateUrl(url)) {
      setError("Please enter a valid URL");
      trackEvent("error", "invalid_url");
      return;
    }

    if (!validateCount(count)) {
      setError(`Number of memes must be between ${MIN_MEMES} and ${MAX_MEMES}`);
      trackEvent("error", "invalid_count");
      return;
    }

    setLoading(true);
    trackEvent("generate_click", `count:${count}`, count);

    try {
      const params = new URLSearchParams({
        url: url,
        num_memes: count.toString(),
      });

      const response = await axios.post<MemeResponse>(
        `${API_BASE_URL}/meme_campaign?${params.toString()}`
      );

      const data = response.data;

      if (data.error) {
        setError(data.error);
        trackEvent("error", "api_error", 0);
      } else if (Array.isArray(data.meme_images)) {
        setMemes(data.meme_images);
        trackEvent(
          "generate_success",
          "memes_generated",
          data.meme_images.length
        );
      } else {
        setError("Unexpected response from server");
        trackEvent("error", "unexpected_response", 0);
      }
    } catch (err: unknown) {
      let errorMessage = "Failed to generate memes. Try again.";
      let errorLabel = "unknown_error";
      let statusCode = 0;

      if (axios.isAxiosError(err)) {
        statusCode = err.response?.status ? err.response?.status : 0;
        if (err.response?.status === 429) {
          errorMessage = err.response.data.error || "Rate limit exceeded";
          errorLabel = "rate_limit";
        } else if (err.response?.status === 504) {
          errorMessage = "Server timeout. Please try again later.";
          errorLabel = "timeout";
        }
      }

      setError(errorMessage);
      trackEvent("error", errorLabel, statusCode);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(
      MAX_MEMES,
      Math.max(MIN_MEMES, Number(e.target.value))
    );
    setCount(value);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    trackEvent("toggle_dark_mode", newMode ? "dark" : "light");
  };

  const handleDownload = (src: string, index: number) => {
    trackEvent("download_meme", `meme_${index + 1}`);
  };

  // Render helpers
  const renderHeader = () => (
    <header className="w-full max-w-xl flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        MemeGen.ai
      </h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? (
          <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
          <Moon className="w-5 h-5 text-gray-700" />
        )}
      </Button>
    </header>
  );

  const renderForm = () => (
    <section className="w-full max-w-xl space-y-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Input
        type="url"
        placeholder="Enter webpage URL"
        value={url}
        onChange={handleUrlChange}
        disabled={loading}
        autoFocus
        className="text-gray-900 dark:text-gray-100"
      />

      <Input
        type="number"
        placeholder={`Number of memes (max ${MAX_MEMES})`}
        value={count}
        onChange={handleCountChange}
        min={MIN_MEMES}
        max={MAX_MEMES}
        disabled={loading}
        className="text-gray-900 dark:text-gray-100"
      />

      <Button
        onClick={generateMemes}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Generating..." : "Generate Memes"}
      </Button>
    </section>
  );

  const renderMemes = () => (
    <section className="w-full max-w-xl mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
      {memes.map((src, index) => (
        <Card key={index} className="bg-gray-100 dark:bg-gray-800 shadow-md">
          <CardContent className="p-0">
            <img
              src={src}
              alt={`Generated meme ${index + 1}`}
              className="w-full h-auto rounded-t-md object-contain"
              loading="lazy"
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <a
              href={src}
              download={`meme-${index + 1}.png`}
              onClick={() => handleDownload(src, index)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Download
            </a>
          </CardFooter>
        </Card>
      ))}
    </section>
  );

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 flex flex-col items-center p-6">
      {renderHeader()}
      {renderForm()}
      {renderMemes()}
    </main>
  );
}
