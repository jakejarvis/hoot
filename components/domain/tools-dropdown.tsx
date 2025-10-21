"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { Favicon } from "@/components/domain/favicon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { REPOSITORY_SLUG } from "@/lib/constants";

type ToolsDropdownProps = {
  domain: string;
};

export function ToolsDropdown({ domain }: ToolsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Open menu" size="icon">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a
            href={`https://crt.sh/?q=${encodeURIComponent(domain)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="crt.sh" />
            crt.sh
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://whois.domaintools.com/${encodeURIComponent(domain)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="domaintools.com" />
            DomainTools
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://intodns.com/${encodeURIComponent(domain)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="intodns.com" />
            intoDNS
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${encodeURIComponent(domain)}&run=toolpage`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="mxtoolbox.com" />
            MxToolbox
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://securityheaders.com/?q=${encodeURIComponent(`https://${domain}`)}&hide=on&followRedirects=on`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="securityheaders.io" />
            Security Headers
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://securitytrails.com/domain/${encodeURIComponent(domain)}/dns`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="securitytrails.com" />
            SecurityTrails
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(`https://${domain}`)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="facebook.com" />
            Sharing Debugger
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.virustotal.com/gui/domain/${encodeURIComponent(domain)}/relations`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="virustotal.com" />
            VirusTotal
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://web.archive.org/web/*/${encodeURIComponent(domain)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="web.archive.org" />
            Wayback Machine
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.whatsmydns.net/#A/${encodeURIComponent(domain)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="whatsmydns.net" />
            What's My DNS?
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://who.is/whois/${encodeURIComponent(domain)}`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Favicon domain="who.is" />
            who.is
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={`https://github.com/${REPOSITORY_SLUG}/issues/new`}
            className="cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Plus />
            Suggest a tool
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
