import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  title: string;
  val: number;
  snippet?: string;
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  source: string | NodeDatum;
  target: string | NodeDatum;
}

export default function PetaPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const [nodes, setNodes] = useState<NodeDatum[]>([]);
  const [links, setLinks] = useState<LinkDatum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<{show: boolean, x: number, y: number, title: string, snippet: string}>({
    show: false, x: 0, y: 0, title: '', snippet: ''
  });

  useEffect(() => {
    async function loadGraphData() {
      try {
        setIsLoading(true);
        // Load all notes
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('id, content');
          
        if (notesError) throw notesError;

        // Load all links
        const { data: linksData, error: linksError } = await supabase
          .from('note_links')
          .select('source_note_id, target_note_id');

        if (linksError) throw linksError;

        if (!notesData) return;

        const graphNodes: NodeDatum[] = notesData.map(n => {
          const rawTitleMatch = n.content.match(/<h1>(.*?)<\/h1>/i);
          const title = rawTitleMatch ? rawTitleMatch[1].replace(/<[^>]+>/g, '').trim() : "Judul Rintisan";
          
          const snippetMatch = n.content.match(/<p[^>]*>(.*?)<\/p>/i);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : "";

          return {
            id: n.id,
            group: 1,
            title,
            snippet,
            val: 1 // default weight
          };
        });

        // Compute degree to make central nodes bigger
        const degMap = new Map<string, number>();
        
        const graphLinks: LinkDatum[] = (linksData || [])
          .filter(l => l.source_note_id && l.target_note_id) // safety check
          .map(l => {
             // count degree
             degMap.set(l.source_note_id, (degMap.get(l.source_note_id) || 0) + 1);
             degMap.set(l.target_note_id, (degMap.get(l.target_note_id) || 0) + 1);
             
             return {
               source: l.source_note_id,
               target: l.target_note_id
             };
          });

        graphNodes.forEach(n => {
          n.val = 1 + (degMap.get(n.id) || 0); // node size based on degree
        });

        setNodes(graphNodes);
        setLinks(graphLinks);
      } catch (err: any) {
        console.error(err);
        setError("Gagal merajut data graf: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadGraphData();
  }, []);

  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current) return;
    if (nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = 600; // Fixed canvas height or dynamic window height, let's go with 600px for now

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    svg.attr("viewBox", [0, 0, width, height].join(" "))
       .attr("class", "w-full h-full cursor-grab active:cursor-grabbing")
       .on("click", (event) => {
         if (event.target.tagName !== "circle" && event.target.tagName !== "text") {
           setTooltip(prev => ({ ...prev, show: false }));
         }
       });

    // Semantic zoom handler
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
      .on("start", () => {
         setTooltip(prev => ({ ...prev, show: false }));
      });

    svg.call(zoom);

    // Group for zooming
    const g = svg.append("g");

    // Physics Simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05));

    // REKOMENDASI 1: Node Culling (Pembatasan Fisika Render)
    // Hentikan komputasi fisika yang berat setelah beberapa saat agar tidak memberatkan device.
    const simulationTimeout = setTimeout(() => {
      simulation.stop();
    }, 3000); // Stop the simulation after 3 seconds of settling down

    // Glow Effect
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Draw Links
    const link = g.append("g")
        .attr("stroke", "#3f3f46") // zinc-700
        .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
        .attr("stroke-width", 1.5);

    // Node interactions
    const drag = d3.drag<SVGGElement, NodeDatum>()
        .on("start", (event, d) => {
          if (!event.active && simulation.alpha() < 0.1) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          setTooltip(prev => ({ ...prev, show: false }));
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          
          // Re-cull after dragged
          setTimeout(() => {
            simulation.stop();
          }, 2000);
        });

    const baseNodeSize = 6;
    const minNodeSize = 6;
    const maxNodeSize = 25;

    // Draw Nodes Containers
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
        .style("cursor", "pointer")
        .call(drag)
        .on("click", (event, d) => {
           // Navigate strictly via react-router wrapper, but to avoid bugs with drag vs click, check event.defaultPrevented
           if (event.defaultPrevented) return; // Dragging
           navigate(`/catatan/${d.id}`);
        });

    // Draw Circles
    node.append("circle")
        .attr("r", d => Math.max(minNodeSize, Math.min(maxNodeSize, baseNodeSize + d.val * 1.5)))
        .attr("fill", "#10b981") // emerald-500
        .attr("stroke", "#0a0a0a") // bg
        .attr("stroke-width", 2)
        .style("filter", "url(#glow)")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("fill", "#34d399").attr("stroke-width", 3); // hover state
          // Highlight links
          link.attr("stroke", (l: any) => l.source.id === d.id || l.target.id === d.id ? "#10b981" : "#3f3f46")
              .attr("stroke-opacity", (l: any) => l.source.id === d.id || l.target.id === d.id ? 1 : 0.2);

          // REKOMENDASI 2: Konteks Abstrak via Hover
          // Menampilkan balok info/tooltip
          const [mouseX, mouseY] = d3.pointer(event, containerRef.current);
          setTooltip({
            show: true,
            x: mouseX + 15,
            y: mouseY + 15,
            title: d.title,
            snippet: d.snippet || "Tidak ada paragraf teks."
          });
        })
        .on("mouseout", function() {
          d3.select(this).attr("fill", "#10b981").attr("stroke-width", 2);
          link.attr("stroke", "#3f3f46").attr("stroke-opacity", 0.6);
          setTooltip(prev => ({ ...prev, show: false }));
        });

    // Draw Labels
    node.append("text")
        .text(d => d.title)
        .attr("x", d => Math.max(minNodeSize, Math.min(maxNodeSize, baseNodeSize + d.val * 1.5)) + 6)
        .attr("y", 4)
        .style("font-family", "monospace")
        .style("font-size", "10px")
        .style("fill", "#a1a1aa") // zinc-400
        .style("pointer-events", "none")
        .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.8)");

    simulation.on("tick", () => {
      link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      clearTimeout(simulationTimeout);
      simulation.stop();
    };
  }, [nodes, links, isLoading, navigate]);

  return (
    <PageContainer className="h-full flex flex-col">
      <header className="mb-6">
        <SectionTitle>Jejaring Epistemologi</SectionTitle>
        <p className="text-zinc-500 text-sm mt-2 tracking-wide font-sans">
          Melihat pangkalan data Anda dari sudut pandang helikopter. Node yang lebih besar menandakan rujukan sentral.
        </p>
      </header>

      {error ? (
        <div className="text-red-400 font-mono text-sm uppercase p-4 border border-red-500/30 bg-red-500/10 rounded">
          {error}
        </div>
      ) : isLoading ? (
        <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center border border-zinc-800/50 bg-[#0a0a0c] rounded-2xl">
           <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
           <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Menghitung matriks graf spasial...</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex-1 min-h-[50vh] flex items-center justify-center border border-zinc-800/50 border-dashed rounded-2xl bg-[#0a0a0c]">
           <p className="text-zinc-600 font-sans italic text-sm text-center px-4">
             Pemetaan kosong. Belum ada konstelasi ide yang terbentuk. <br/><br/>
             Mulai hubungkan dua konsep menggunakan `[[Tautan]]` di editor Catatan.
           </p>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="flex-1 w-full min-h-[60vh] border border-zinc-800/60 bg-[#060608] rounded-2xl overflow-hidden relative shadow-inner"
        >
          {/* Overlay Guide */}
          <div className="absolute bottom-4 left-4 pointer-events-none bg-zinc-950/80 p-3 border border-zinc-800 rounded backdrop-blur-sm z-10">
            <h4 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1">Panduan Kanvas</h4>
            <ul className="text-xs font-sans text-zinc-500 space-y-1">
              <li><span className="text-zinc-300">Scroll:</span> Zoom In/Out</li>
              <li><span className="text-zinc-300">Drag bg:</span> Geser Peta</li>
              <li><span className="text-zinc-300">Drag Node:</span> Pindahkan Simpul</li>
              <li><span className="text-zinc-300">Klik Node:</span> Buka Catatan</li>
            </ul>
          </div>
          
          {/* REKOMENDASI 2: Konteks Abstrak via Hover (Tooltip Panel) */}
          {tooltip.show && (
            <div 
              className="absolute z-50 pointer-events-none max-w-[250px] bg-[#0a0a0c] border border-zinc-700/80 shadow-2xl rounded-lg overflow-hidden flex flex-col"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: 'translate(10px, 10px)' // slight offset
              }}
            >
              <div className="p-3 border-b border-zinc-800/60 bg-zinc-900/40">
                <h3 className="font-serif tracking-wide text-zinc-200 text-[13px] leading-snug">{tooltip.title}</h3>
              </div>
              {tooltip.snippet && (
                <div className="p-3 bg-[#0a0a0c]/80 backdrop-blur">
                  <p className="text-zinc-400 font-sans text-[11px] leading-relaxed line-clamp-3">
                    "{tooltip.snippet}"
                  </p>
                </div>
              )}
            </div>
          )}

          <svg ref={svgRef}></svg>
        </div>
      )}
    </PageContainer>
  );
}

