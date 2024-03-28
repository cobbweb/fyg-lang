{ pkgs, ... }:

{
  packages = with pkgs; [ 
    git 
    openssl
    watchexec
    rust-analyzer
  ];

  languages.rust.enable = true;
  languages.go.enable = true;

  # See full reference at https://devenv.sh/reference/options/
}
