import "@/styles/globals.css";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import Layout from "@/components/Layout/layout";



function MyApp({ Component, pageProps }) {
  
  const PageComponent = (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {PageComponent}
    </ThemeProvider>
  );
}

export default MyApp;
