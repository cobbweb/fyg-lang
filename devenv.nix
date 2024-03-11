{ pkgs, ... }:

{
  # See full reference at https://devenv.sh/reference/options/

  packages = with pkgs; [ 
    git
    quickjs
    bun
    watchexec
  ];

  languages.javascript.enable = true;
  languages.typescript.enable = true;
}
