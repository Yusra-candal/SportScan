{pkgs}: {
  deps = [
    pkgs.libglvnd
    pkgs.libGL
    pkgs.glib
    pkgs.xorg.libICE
    pkgs.xorg.libSM
    pkgs.xorg.libXext
    pkgs.xorg.libX11
    pkgs.xorg.libxcb
  ];
}
