// From https://solana.stackexchange.com/questions/16703/can-anchor-client-be-used-with-solana-web3-js-2-0rc
import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderJavaScriptVisitor } from "@codama/renderers";
import * as path from "path";
import { promises as fs } from "fs";

// Find the Anchor IDL file and return the JSON object
const loadAnchorIDL = async () => {
  const basePath = path.join("target", "idl");
  const dirPath = path.join(basePath);
  
  try {
    // Read the directory contents
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${dirPath}`);
    }
    
    if (jsonFiles.length > 1) {
      throw new Error(`Multiple JSON files found in ${dirPath}. Please specify which one to use.`);
    }
    
    const filePath = path.join(dirPath, jsonFiles[0]);
    console.log(`📖 Loading IDL from: ${filePath}`);
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Failed to load IDL: ${dirPath} does not exist. Run 'anchor build' first.`);
    }
    throw error;
  }
};

console.log('🔧 Generating Codama clients with Solana Kit...');

try {
  // Instantiate Codama
  const idl = await loadAnchorIDL();
  console.log(`✅ Loaded IDL for program: ${idl.name || idl.metadata?.name || 'Unknown'}`);

  const codama = createFromRoot(rootNodeFromAnchor(idl));

  // Render JavaScript client with Solana Kit
  const generatedPath = path.join("clients", "js", "src", "generated");
  console.log(`📝 Generating JavaScript client to: ${generatedPath}`);
  
  codama.accept(renderJavaScriptVisitor(generatedPath, {
    useGranularImports: true
  }));

  console.log('✅ Codama JavaScript client generated successfully!');
  console.log('📂 Client location: ./clients/js/src/generated/');
  console.log('💡 You can now import and use the generated client with Solana Kit.');
  console.log('📖 Example: import { createTemplateProgramClient } from "../clients/js/src/generated";'); // Correct import path for generated clients

} catch (error) {
  console.error('❌ Error generating Codama clients:', error);
  process.exit(1);
}