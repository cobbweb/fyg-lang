{ pkgs, ... }:

{
  # See full reference at https://devenv.sh/reference/options/

  packages = with pkgs; [ 
    git
    quickjs
    bun
  ];

  languages.javascript.enable = true;
  languages.typescript.enable = true;
}
