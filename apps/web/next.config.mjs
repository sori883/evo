/** @type {import('next').NextConfig} */
const nextConfig = {
  // workspace の共有パッケージをトランスパイル対象にする
  transpilePackages: ["@evo/shared"],
};

export default nextConfig;
